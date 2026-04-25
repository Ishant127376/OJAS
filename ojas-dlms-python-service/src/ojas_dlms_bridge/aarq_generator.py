from gurux_dlms import GXDLMSClient
from gurux_dlms.GXCiphering import GXCiphering
from gurux_dlms.enums import Authentication, InterfaceType, Security


def generate_aarq_hex() -> str:
    # -------- CONFIG --------
    CLIENT_ADDR = 32
    SERVER_ADDR = 1
    PASSWORD = b"LWTSM"

    # -------- KEYS --------
    SYSTEM_TITLE = bytes.fromhex("4142434431323334")
    AUTH_KEY = bytes.fromhex("30313233343536373839414243444546")
    BLOCK_KEY = bytes.fromhex("30313233343536373839414243444546")
    DEDICATED_KEY = bytes.fromhex("30313233343536373839414243444546")

    # -------- CLIENT --------
    client = GXDLMSClient(
        useLogicalNameReferencing=True,
        clientAddress=CLIENT_ADDR,
        serverAddress=SERVER_ADDR,
        interfaceType=InterfaceType.WRAPPER,
    )

    client.authentication = Authentication.LOW
    client.password = PASSWORD

    # -------- CIPHER --------
    cipher = GXCiphering(SYSTEM_TITLE)
    cipher.security = Security.AUTHENTICATION_ENCRYPTION
    cipher.authenticationKey = AUTH_KEY
    cipher.blockCipherKey = BLOCK_KEY
    cipher.dedicatedKey = DEDICATED_KEY

    # 🔥 IMPORTANT: Must match script exactly
    cipher.invocationCounter = 1

    # 🔥 IMPORTANT: attach cipher in BOTH places
    client.ciphering = cipher
    client.settings.cipher = cipher

    # 🔥 IMPORTANT: ensure fresh association state
    client.settings.connected = False

    # -------- GENERATE AARQ --------
    aarq = client.aarqRequest()

    # Gurux sometimes returns list
    if isinstance(aarq, list):
        aarq = aarq[0]

    return aarq.hex()