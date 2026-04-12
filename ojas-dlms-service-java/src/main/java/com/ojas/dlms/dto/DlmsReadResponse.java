package com.ojas.dlms.dto;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class DlmsReadResponse {
    private String deviceId;
    private Instant timestamp;
    private Map<String, Object> metrics = new HashMap<>();
    private Map<String, Object> raw = new HashMap<>();

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics) {
        this.metrics = metrics;
    }

    public Map<String, Object> getRaw() {
        return raw;
    }

    public void setRaw(Map<String, Object> raw) {
        this.raw = raw;
    }
}
