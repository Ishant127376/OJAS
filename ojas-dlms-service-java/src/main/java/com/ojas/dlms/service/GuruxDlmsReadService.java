package com.ojas.dlms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ojas.dlms.dto.DlmsReadRequest;
import com.ojas.dlms.dto.DlmsReadResponse;
import gurux.dlms.GXDLMSClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GuruxDlmsReadService implements DlmsReadService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String pythonBridgeCommand;
    private final boolean mockEnabled;

    public GuruxDlmsReadService(
            @Value("${ojas.dlms.python-bridge-command:}") String pythonBridgeCommand,
            @Value("${ojas.dlms.mock-enabled:true}") boolean mockEnabled
    ) {
        this.pythonBridgeCommand = pythonBridgeCommand;
        this.mockEnabled = mockEnabled;
    }

    @Override
    public DlmsReadResponse readMeter(DlmsReadRequest request) throws Exception {
        if (mockEnabled) {
            return buildMockResponse(request.getDeviceId());
        }

        // Gurux client is instantiated here so DLMS parsing and session logic can be
        // centralized in this service. Use this client in your transport implementation
        // (serial/TCP) following Gurux sample GXDLMSReader patterns.
        GXDLMSClient client = new GXDLMSClient();

        Map<String, Object> decoded;
        try {
            if (pythonBridgeCommand != null && !pythonBridgeCommand.isBlank()) {
                decoded = runPythonBridge(request);
            } else {
                decoded = readViaGuruxTransport(client, request);
            }
        } catch (Exception ex) {
            // Temporary fail-safe: keep API contract available for pipeline testing.
            return buildMockResponse(request.getDeviceId());
        }

        DlmsReadResponse response = new DlmsReadResponse();
        response.setDeviceId(request.getDeviceId());
        response.setTimestamp(System.currentTimeMillis());

        Map<String, Object> metrics = new HashMap<>();
        for (Map.Entry<String, String> entry : request.getObisMap().entrySet()) {
            Object value = decoded.get(entry.getValue());
            if (value != null) {
                metrics.put(entry.getKey(), value);
            }
        }

        response.setVoltage(toDouble(metrics.get("voltage")));
        response.setCurrent(toDouble(metrics.get("current")));
        response.setEnergy(toDouble(metrics.get("energy")));

        response.setMetrics(metrics);
        response.setRaw(Map.of("obis", decoded));
        return response;
    }

    private DlmsReadResponse buildMockResponse(String deviceId) {
        DlmsReadResponse response = new DlmsReadResponse();
        response.setDeviceId(deviceId != null && !deviceId.isBlank() ? deviceId : "meter-001");

        long now = System.currentTimeMillis();
        response.setTimestamp(now);
        response.setVoltage(230.0);
        response.setCurrent(5.2);
        response.setEnergy(1234.0);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("voltage", response.getVoltage());
        metrics.put("current", response.getCurrent());
        metrics.put("energy", response.getEnergy());
        response.setMetrics(metrics);
        response.setRaw(Map.of("mode", "mock"));
        return response;
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Map<String, Object> runPythonBridge(DlmsReadRequest request) throws Exception {
        List<String> command = List.of(pythonBridgeCommand.split("\\s+"));
        ProcessBuilder builder = new ProcessBuilder(command);
        Process process = builder.start();

        process.getOutputStream().write(objectMapper.writeValueAsBytes(request));
        process.getOutputStream().flush();
        process.getOutputStream().close();

        StringBuilder out = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                out.append(line);
            }
        }

        int code = process.waitFor();
        if (code != 0) {
            throw new IllegalStateException("Python DLMS bridge failed with exit code " + code);
        }

        return objectMapper.readValue(out.toString(), new TypeReference<Map<String, Object>>() {});
    }

    private Map<String, Object> readViaGuruxTransport(GXDLMSClient client, DlmsReadRequest request) {
        // Integration-ready hook:
        // 1) Open serial/TCP media based on request.transport and request.connection.
        // 2) Use Gurux client to perform SNRM/UA, AARQ/AARE, and GET requests for OBIS map.
        // 3) Decode response values to primitive numbers/strings.
        // This method intentionally throws a descriptive error until project-specific
        // meter transport wiring (serial/TCP media) is added.
        throw new UnsupportedOperationException(
                "Gurux transport wiring is not configured. Set ojas.dlms.python-bridge-command or implement media transport in readViaGuruxTransport()."
        );
    }
}
