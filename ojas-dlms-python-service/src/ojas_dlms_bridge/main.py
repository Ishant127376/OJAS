import logging
import signal
import sys

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

    reader = DlmsMeterReader(settings.dlms, logger)
    publisher = MqttPublisher(settings.mqtt, logger)
    service = DlmsMqttBridgeService(settings, reader, publisher, logger)

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
