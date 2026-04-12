package com.ojas.dlms.service;

import com.ojas.dlms.dto.DlmsReadRequest;
import com.ojas.dlms.dto.DlmsReadResponse;

public interface DlmsReadService {
    DlmsReadResponse readMeter(DlmsReadRequest request) throws Exception;
}
