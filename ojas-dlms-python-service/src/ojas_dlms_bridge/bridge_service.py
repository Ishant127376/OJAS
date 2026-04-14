import logging
import time
from typing import Dict, Any

from .dlms_reader import DlmsMeterReader
from .mqtt_publisher import MqttPublisher
from .settings import BridgeSettings


class DlmsMqttBridgeService:
    def __init__(self, settings: BridgeSettings, logger: logging.Logger) -> None:
        self.settings = settings
        self.logger = logger
        self.reader = DlmsMeterReader(settings.dlms, logger)
        self.publisher = MqttPublisher(settings.mqtt, logger)
        self.running = False

    def run_forever(self) -> None:
        self.publisher.connect()
        self.running = True

        while self.running:
            try:
                if not self.publisher.connected and not self.publisher.wait_until_connected(timeout_sec=10):
                    self.logger.warning("MQTT not connected yet; retrying")
                    time.sleep(self.settings.retry_delay_sec)
                    continue

                self.reader.connect()
                metrics = self.reader.read_metrics()

                payload: Dict[str, Any] = {
                    "voltage": metrics.get("voltage"),
                    "current": metrics.get("current"),
                    "energy": metrics.get("energy"),
                    "timestamp": int(time.time() * 1000),
                }

                # Add optional extra fields when available.
                for extra_key in ("power", "frequency", "powerFactor", "temperature"):
                    if extra_key in metrics:
                        payload[extra_key] = metrics[extra_key]

                ok = self.publisher.publish_json(self.settings.publish_topic, payload, qos=1)
                if ok:
                    self.logger.info("Bridge cycle completed for device=%s", self.settings.device_id)

                time.sleep(self.settings.poll_interval_sec)
            except Exception as exc:
                self.logger.exception("Bridge cycle failed: %s", exc)
                self.reader.close()
                time.sleep(self.settings.retry_delay_sec)

    def stop(self) -> None:
        self.running = False
        self.reader.close()
        self.publisher.close()
