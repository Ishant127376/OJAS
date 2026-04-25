import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict


def _to_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_bytes_from_hex(value: str, field_name: str) -> bytes:
    if value is None or not str(value).strip():
        raise ValueError(f"Missing required setting: {field_name}")
    try:
        return bytes.fromhex(str(value).strip())
    except ValueError as exc:
        raise ValueError(f"Invalid hex for {field_name}") from exc


@dataclass
class MqttSettings:
    endpoint: str
    port: int
    client_id: str
    username: str
    password: str
    pub_topic: str
    use_tls: bool = True
    use_cert: bool = False
    ca: str = ""
    cert: str = ""
    key: str = ""


@dataclass
class DlmsSettings:
    mode: str
    ip: str
    tcp_port: int
    serial_port: str
    baudrate: int
    client_address: int
    server_address: int
    interface: str
    authentication: str
    security: str
    password: bytes
    system_title: bytes
    auth_key: bytes
    block_key: bytes
    dedicated_key: bytes
    invocation_counter: int
    obis_map: Dict[str, str] = field(default_factory=dict)


@dataclass
class BridgeSettings:
    device_id: str
    topic_template: str
    poll_interval_sec: int
    retry_delay_sec: int
    mqtt: MqttSettings
    dlms: DlmsSettings

    @property
    def publish_topic(self) -> str:
        if self.mqtt.pub_topic:
            return self.mqtt.pub_topic
        return self.topic_template.format(device_id=self.device_id)


def _load_json_config(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _require_non_empty(value: Any, field_name: str) -> Any:
    if value is None:
        raise ValueError(f"Missing required setting: {field_name}")
    if isinstance(value, str) and not value.strip():
        raise ValueError(f"Missing required setting: {field_name}")
    return value


def load_settings() -> BridgeSettings:
    config_path = Path(os.getenv("OJAS_DLMS_CONFIG", "config.json")).resolve()
    cfg = _load_json_config(config_path)

    mqtt_cfg = cfg.get("mqtt", {})
    dlms_cfg = cfg.get("dlms", {})

    device_id = _require_non_empty(
        cfg.get("device_id") or os.getenv("OJAS_DEVICE_ID"),
        "device_id",
    )

    mqtt_endpoint = _require_non_empty(
        mqtt_cfg.get("endpoint") or os.getenv("MQTT_ENDPOINT"),
        "mqtt.endpoint",
    )
    mqtt_username = _require_non_empty(
        mqtt_cfg.get("username") or os.getenv("MQTT_USERNAME"),
        "mqtt.username",
    )
    mqtt_password = _require_non_empty(
        mqtt_cfg.get("password") or os.getenv("MQTT_PASSWORD"),
        "mqtt.password",
    )

    default_pub_topic = f"device/{device_id}/telemetry"
    mqtt_pub_topic = _require_non_empty(
        mqtt_cfg.get("pub_topic") or os.getenv("MQTT_PUB_TOPIC") or default_pub_topic,
        "mqtt.pub_topic",
    )

    dlms_mode = (dlms_cfg.get("mode") or os.getenv("DLMS_MODE") or "serial").strip().lower()
    if dlms_mode not in {"serial", "tcp"}:
        raise ValueError("Invalid dlms.mode. Supported values: serial, tcp")

    serial_port = dlms_cfg.get("serial_port") or dlms_cfg.get("port") or os.getenv("DLMS_SERIAL_PORT") or os.getenv("DLMS_PORT")
    tcp_ip = dlms_cfg.get("ip") or os.getenv("DLMS_IP")
    tcp_port = _to_int(dlms_cfg.get("tcp_port") or dlms_cfg.get("port") or os.getenv("DLMS_TCP_PORT") or os.getenv("DLMS_PORT"), 4059)

    if dlms_mode == "serial":
        _require_non_empty(serial_port, "dlms.serial_port")
    if dlms_mode == "tcp":
        _require_non_empty(tcp_ip, "dlms.ip")

    obis_map = dlms_cfg.get("obis_map")
    if not isinstance(obis_map, dict) or not obis_map:
        raise ValueError("Missing required setting: dlms.obis_map")

    poll_interval_sec = _to_int(cfg.get("poll_interval_sec") or os.getenv("OJAS_POLL_INTERVAL_SEC"), 0)
    if poll_interval_sec <= 0:
        raise ValueError("Missing required setting: poll_interval_sec")

    mqtt = MqttSettings(
        endpoint=mqtt_endpoint,
        port=_to_int(mqtt_cfg.get("port") or os.getenv("MQTT_PORT"), 8883),
        client_id=mqtt_cfg.get("client_id") or os.getenv("MQTT_CLIENT_ID", "python_dlms_bridge"),
        username=mqtt_username,
        password=mqtt_password,
        pub_topic=mqtt_pub_topic,
        use_tls=_to_bool(mqtt_cfg.get("use_tls", os.getenv("MQTT_USE_TLS", True)), True),
        use_cert=_to_bool(mqtt_cfg.get("use_cert", os.getenv("MQTT_USE_CERT", False)), False),
        ca=mqtt_cfg.get("ca") or os.getenv("MQTT_CA", ""),
        cert=mqtt_cfg.get("cert") or os.getenv("MQTT_CERT", ""),
        key=mqtt_cfg.get("key") or os.getenv("MQTT_KEY", ""),
    )

    # Debug-safe defaults for ciphering material when values are not provided.
    system_title_hex = dlms_cfg.get("system_title_hex") or os.getenv("DLMS_SYSTEM_TITLE_HEX") or "4142434431323334"
    auth_key_hex = dlms_cfg.get("auth_key_hex") or os.getenv("DLMS_AUTH_KEY_HEX") or "30313233343536373839414243444546"
    block_key_hex = dlms_cfg.get("block_key_hex") or os.getenv("DLMS_BLOCK_KEY_HEX") or "30313233343536373839414243444546"
    dedicated_key_hex = dlms_cfg.get("dedicated_key_hex") or os.getenv("DLMS_DEDICATED_KEY_HEX") or "30313233343536373839414243444546"

    dlms = DlmsSettings(
        mode=dlms_mode,
        ip=tcp_ip or "",
        tcp_port=tcp_port,
        serial_port=serial_port or "",
        baudrate=_to_int(dlms_cfg.get("baudrate") or os.getenv("DLMS_BAUDRATE"), 9600),
        client_address=_to_int(dlms_cfg.get("client_address") or os.getenv("DLMS_CLIENT_ADDRESS"), 16),
        server_address=_to_int(dlms_cfg.get("server_address") or os.getenv("DLMS_SERVER_ADDRESS"), 1),
        interface=(dlms_cfg.get("interface") or os.getenv("DLMS_INTERFACE", "WRAPPER")).upper(),
        authentication=(dlms_cfg.get("authentication") or os.getenv("DLMS_AUTHENTICATION", "LOW")).upper(),
        security=(dlms_cfg.get("security") or os.getenv("DLMS_SECURITY", "AUTHENTICATION_ENCRYPTION")).upper(),
        password=(dlms_cfg.get("password") or os.getenv("DLMS_PASSWORD", "")).encode("utf-8"),
        system_title=_to_bytes_from_hex(system_title_hex, "dlms.system_title_hex"),
        auth_key=_to_bytes_from_hex(auth_key_hex, "dlms.auth_key_hex"),
        block_key=_to_bytes_from_hex(block_key_hex, "dlms.block_key_hex"),
        dedicated_key=_to_bytes_from_hex(dedicated_key_hex, "dlms.dedicated_key_hex"),
        invocation_counter=_to_int(dlms_cfg.get("invocation_counter") or os.getenv("DLMS_INVOCATION_COUNTER"), 1),
        obis_map=obis_map,
    )

    return BridgeSettings(
        device_id=device_id,
        topic_template=cfg.get("topic_template") or os.getenv("OJAS_TOPIC_TEMPLATE", "device/{device_id}/telemetry"),
        poll_interval_sec=poll_interval_sec,
        retry_delay_sec=_to_int(cfg.get("retry_delay_sec") or os.getenv("OJAS_RETRY_DELAY_SEC"), 3),
        mqtt=mqtt,
        dlms=dlms,
    )
