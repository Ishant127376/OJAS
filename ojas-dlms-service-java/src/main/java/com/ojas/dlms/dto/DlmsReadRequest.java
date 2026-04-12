package com.ojas.dlms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

public class DlmsReadRequest {
    @NotBlank
    private String deviceId;

    @NotBlank
    private String transport;

    @NotNull
    private Map<String, Object> connection = new HashMap<>();

    @NotNull
    private Map<String, String> obisMap = new HashMap<>();

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getTransport() {
        return transport;
    }

    public void setTransport(String transport) {
        this.transport = transport;
    }

    public Map<String, Object> getConnection() {
        return connection;
    }

    public void setConnection(Map<String, Object> connection) {
        this.connection = connection;
    }

    public Map<String, String> getObisMap() {
        return obisMap;
    }

    public void setObisMap(Map<String, String> obisMap) {
        this.obisMap = obisMap;
    }
}
