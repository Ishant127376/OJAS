import json
import logging
import time
from typing import Any, Dict

from .dlms_reader import DlmsMeterReader
from .mqtt_publisher import MqttPublisher
from .settings import BridgeSettings


class DlmsMqttBridgeService:
    def __init__(
        self,
        settings: BridgeSettings,
        reader: DlmsMeterReader,
        publisher: MqttPublisher,
        logger: logging.Logger,
    ) -> None:
        self.settings = settings
        self.logger = logger
        self.reader = reader
        self.publisher = publisher
        self.running = False

    def run_forever(self) -> None:
        self.running = True

        try:
            self.publisher.connect()
        except Exception:
            self.logger.exception("Initial MQTT connect failed; bridge will retry")

        while self.running:
            try:
                data = self.reader.read_all()

                payload: Dict[str, Any] = {
                    **data,
                    "timestamp": int(time.time()),
                }

                published = self.publisher.publish(self.settings.publish_topic, json.dumps(payload), qos=1)
                if not published:
                    raise RuntimeError("MQTT publish failed")

                self.logger.info(
                    "Data published to %s: %s",
                    self.settings.publish_topic,
                    payload,
                )
                self.logger.info("Bridge cycle completed for device=%s", self.settings.device_id)
                time.sleep(self.settings.poll_interval_sec)
            except Exception:
                self.logger.exception("Bridge cycle failed; reconnecting DLMS and MQTT")
                self.reader.close()
                try:
                    self.publisher.connect()
                except Exception:
                    self.logger.exception("MQTT reconnect attempt failed")
                time.sleep(self.settings.retry_delay_sec)

    def stop(self) -> None:
        self.running = False
        self.reader.close()
        self.publisher.close()
