import time
from gurux_dlms import GXDLMSClient
from gurux_dlms.enums import InterfaceType, Authentication, Security
from gurux_dlms.objects import GXDLMSRegister
from gurux_dlms.GXByteBuffer import GXByteBuffer
#from gurux_dlms.secure import GXCiphering
from gurux_dlms.GXCiphering import GXCiphering
from gurux_dlms import GXReplyData
 
 
CLIENT_ADDR = 32      # 🔥 match -c 32
SERVER_ADDR = 1
 
PASSWORD = b"LWTSM"   # 🔥 match -P
 
OBIS = "1.0.1.8.0.255"
 
# -------- KEYS (HEX → BYTES) --------
SYSTEM_TITLE = bytes.fromhex("4142434431323334")
AUTH_KEY     = bytes.fromhex("30313233343536373839414243444546")
BLOCK_KEY    = bytes.fromhex("30313233343536373839414243444546")
DEDICATED_KEY= bytes.fromhex("30313233343536373839414243444546")
 
 
# -------- DLMS CLIENT --------
client = GXDLMSClient(
    useLogicalNameReferencing=True,
    clientAddress=CLIENT_ADDR,
    serverAddress=SERVER_ADDR,
    interfaceType=InterfaceType.WRAPPER
)
 
client.authentication = Authentication.LOW
client.password = PASSWORD
 
# -------- CIPHERING --------
cipher = GXCiphering(SYSTEM_TITLE)
 
cipher.security = Security.AUTHENTICATION_ENCRYPTION
cipher.authenticationKey = AUTH_KEY
cipher.blockCipherKey = BLOCK_KEY
cipher.dedicatedKey = DEDICATED_KEY
cipher.invocationCounter = 1
 
client.ciphering = cipher
client.settings.cipher = cipher   # 🔥 MUST
 
 
def read_object(obj, attr):
    req = client.read(obj, attr)
    reply = send_and_receive(req, "GET")
 
    rd = GXReplyData()
    client.getData(reply, rd)
 
    if rd.value is not None:
        print("Parsed Value:", rd.value)
    else:
        print("❌ No parsed value")
 
# -------- HELPER --------
def send_and_receive(data, name=""):
    print(f"\n➡ {name}")
 
    if isinstance(data, list):
        data = data[0]
 
    print("TX:", data.hex())
 
    if resp:
        print("RX:", resp.hex())
    else:
        print("❌ No response")
 
    return resp
 
try:
    # -------- AARQ --------
    aarq = client.aarqRequest()
    aare = send_and_receive(aarq, "AARQ")
 
    if not aare:
        raise Exception("No AARE")
 
    client.parseAareResponse(GXByteBuffer(aare[8:]))
 
    print("\n✅ Association Successful (SECURE)")
 
    # -------- READ ENERGY --------
    obj = GXDLMSRegister(OBIS)
    read_object(obj,2)
    #req = client.read(obj, 2)
    #reply = send_and_receive(req, "GET")
 
    #client.updateValue(obj, 2, GXByteBuffer(reply[8:]))
 
    #print(f"\n⚡ Active Energy:", obj.value)
 
    read_object(obj,3)
    # -------- READ SCALER --------
    #req = client.read(obj, 3)
    #reply = send_and_receive(req, "GET Scaler")
 
    #client.updateValue(obj, 3, GXByteBuffer(reply[8:]))
 
    #print("Scaler:", obj.scaler)
    #print("Unit:", obj.unit)
 
except Exception as e:
    print("❌ Error:", e)
 
finally:
    print("🔌 Serial closed")