import logging
import signal
import sys
import os

from .bridge_service import DlmsMqttBridgeService
from .dlms_reader import DlmsMeterReader
from .mqtt_publisher import MqttPublisher
from .settings import load_settings


def configure_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    return logging.getLogger("ojas-dlms-bridge")


def main() -> int:
    logger = configure_logging()
    settings = load_settings()

    logger.info("Starting OJAS DLMS bridge device=%s topic=%s", settings.device_id, settings.publish_topic)
    logger.info("Bridge mode: REAL_DLMS (%s)", settings.dlms.mode.upper())

    reader = DlmsMeterReader(settings.dlms, logger)
    publisher = MqttPublisher(settings.mqtt, logger)
    service = DlmsMqttBridgeService(settings, reader, publisher, logger)

    if os.getenv("OJAS_DEBUG_DLMS", "").lower() == "true":
        try:
            commands = reader.debug_generate_commands()
            logger.info("Voltage HEX: %s", commands.get("voltage"))
            logger.info("Current HEX: %s", commands.get("current"))
            logger.info("Energy HEX: %s", commands.get("energy"))
        except Exception:
            logger.exception("DLMS debug command generation failed")
            return 1
        return 0

    if os.getenv("OJAS_RUN_DLMS_STARTUP_TEST", "").lower() == "true":
        logger.info("Running DLMS startup read test")
        try:
            test_data = reader.read_all()
            logger.info("Startup DLMS read successful: %s", test_data)
        except Exception:
            logger.exception("Startup DLMS read test failed")


    def _shutdown(signum, frame):
        logger.info("Shutdown signal received (%s)", signum)
        service.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    service.run_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
