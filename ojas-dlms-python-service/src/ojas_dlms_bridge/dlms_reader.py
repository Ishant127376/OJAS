import logging
import time
from typing import Dict, Any

import serial
from gurux_dlms import GXDLMSClient, GXReplyData
from gurux_dlms.GXByteBuffer import GXByteBuffer
from gurux_dlms.GXCiphering import GXCiphering
from gurux_dlms.enums import InterfaceType, Authentication, Security
from gurux_dlms.objects import GXDLMSRegister

from .settings import DlmsSettings


_INTERFACE_MAP = {
    "WRAPPER": InterfaceType.WRAPPER,
    "HDLC": InterfaceType.HDLC,
}

_AUTH_MAP = {
    "NONE": Authentication.NONE,
    "LOW": Authentication.LOW,
    "HIGH": Authentication.HIGH,
    "HIGH_MD5": Authentication.HIGH_MD5,
    "HIGH_SHA1": Authentication.HIGH_SHA1,
    "HIGH_GMAC": Authentication.HIGH_GMAC,
    "HIGH_SHA256": Authentication.HIGH_SHA256,
}

_SECURITY_MAP = {
    "NONE": Security.NONE,
    "AUTHENTICATION": Security.AUTHENTICATION,
    "ENCRYPTION": Security.ENCRYPTION,
    "AUTHENTICATION_ENCRYPTION": Security.AUTHENTICATION_ENCRYPTION,
}


class DlmsMeterReader:
    def __init__(self, settings: DlmsSettings, logger: logging.Logger) -> None:
        self.settings = settings
        self.logger = logger
        self.ser = None
        self.client = None

    def connect(self) -> None:
        if self.ser and self.ser.is_open and self.client is not None:
            return

        self.ser = serial.Serial(
            port=self.settings.port,
            baudrate=self.settings.baudrate,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=2,
        )
        self.logger.info("DLMS serial opened on %s @ %s", self.settings.port, self.settings.baudrate)

        interface_type = _INTERFACE_MAP.get(self.settings.interface, InterfaceType.WRAPPER)
        auth = _AUTH_MAP.get(self.settings.authentication, Authentication.LOW)

        self.client = GXDLMSClient(
            useLogicalNameReferencing=True,
            clientAddress=self.settings.client_address,
            serverAddress=self.settings.server_address,
            interfaceType=interface_type,
        )
        self.client.authentication = auth
        self.client.password = self.settings.password

        cipher = GXCiphering(self.settings.system_title)
        cipher.security = _SECURITY_MAP.get(self.settings.security, Security.AUTHENTICATION_ENCRYPTION)
        cipher.authenticationKey = self.settings.auth_key
        cipher.blockCipherKey = self.settings.block_key
        cipher.dedicatedKey = self.settings.dedicated_key
        cipher.invocationCounter = self.settings.invocation_counter

        self.client.ciphering = cipher
        self.client.settings.cipher = cipher

        aarq = self.client.aarqRequest()
        aare = self._send_and_receive(aarq, "AARQ")
        if not aare:
            raise RuntimeError("No AARE response from meter")

        # For WRAPPER framing, payload starts after 8-byte wrapper header.
        payload = aare[8:] if len(aare) > 8 else aare
        self.client.parseAareResponse(GXByteBuffer(payload))
        self.logger.info("DLMS association successful")

    def _send_and_receive(self, data: Any, name: str) -> bytes:
        if isinstance(data, list):
            data = data[0]

        if self.client and self.client.ciphering:
            self.client.ciphering.invocationCounter += 1

        self.logger.debug("DLMS TX [%s]: %s", name, data.hex())
        self.ser.write(data)
        time.sleep(0.7)
        resp = self.ser.read(4096)

        if not resp:
            raise TimeoutError(f"No DLMS response for {name}")

        self.logger.debug("DLMS RX [%s]: %s", name, resp.hex())
        return resp

    def read_obis(self, obis_code: str, attribute: int = 2) -> Any:
        if not self.client:
            raise RuntimeError("DLMS client is not connected")

        obj = GXDLMSRegister(obis_code)
        req = self.client.read(obj, attribute)
        reply = self._send_and_receive(req, f"GET {obis_code}")

        rd = GXReplyData()
        self.client.getData(reply, rd)

        if rd.value is not None:
            return rd.value

        value = getattr(obj, "value", None)
        return value

    def read_metrics(self) -> Dict[str, Any]:
        metrics: Dict[str, Any] = {}
        for key, obis in self.settings.obis_map.items():
            try:
                value = self.read_obis(obis, attribute=2)
                if isinstance(value, (bytes, bytearray)):
                    value = value.hex()
                metrics[key] = _to_numeric_if_possible(value)
            except Exception as exc:
                self.logger.exception("DLMS read failed for %s (%s)", key, obis)
                metrics[key] = None
        return metrics

    def close(self) -> None:
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None
        self.client = None


def _to_numeric_if_possible(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        # Keep integers as integers where possible.
        n = float(value)
        return int(n) if n.is_integer() else n
    except (TypeError, ValueError):
        return value
