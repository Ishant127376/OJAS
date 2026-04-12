package com.ojas.dlms.controller;

import com.ojas.dlms.dto.DlmsReadRequest;
import com.ojas.dlms.dto.DlmsReadResponse;
import com.ojas.dlms.service.DlmsReadService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class DlmsController {
    private final DlmsReadService dlmsReadService;
    private final String apiKey;

    public DlmsController(DlmsReadService dlmsReadService,
                          @Value("${ojas.dlms.api-key:}") String apiKey) {
        this.dlmsReadService = dlmsReadService;
        this.apiKey = apiKey;
    }

    @PostMapping("/read")
    public ResponseEntity<DlmsReadResponse> read(@Valid @RequestBody DlmsReadRequest request,
                                                 @RequestHeader(value = "x-dlms-api-key", required = false) String requestApiKey,
                                                 HttpServletRequest httpServletRequest) throws Exception {
        authorize(requestApiKey, httpServletRequest);
        DlmsReadResponse response = dlmsReadService.readMeter(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/telemetry")
    public ResponseEntity<DlmsReadResponse> telemetry(@Valid @RequestBody DlmsReadRequest request,
                                                      @RequestHeader(value = "x-dlms-api-key", required = false) String requestApiKey,
                                                      HttpServletRequest httpServletRequest) throws Exception {
        authorize(requestApiKey, httpServletRequest);
        DlmsReadResponse response = dlmsReadService.readMeter(request);
        return ResponseEntity.ok(response);
    }

    private void authorize(String requestApiKey, HttpServletRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }

        if (requestApiKey == null || !apiKey.equals(requestApiKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid DLMS API key");
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown caller");
        }
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "success", false,
                        "error", ex.getMessage()
                ));
    }
}
