// Hợp đồng dữ liệu Lớp 1 X-Ray đồng bộ với POST /api/xray/analyze của KinShield-Core.
export type XRayRiskLevel = 'SAFE' | 'WARN' | 'BLOCK' | 'LOCKDOWN';

export interface XRayAgentFinding {
    agent: string;
    status: string;
    score: number;
    detail: string;
}

export interface XRayVietQr {
    aid: string;
    bankBin: string;
    bankName: string;
    accountNumber: string;
    amountVnd: number | null;
    purpose: string;
    crcValid: boolean | null;
    isDynamic: boolean;
}

export interface XRayAnalyzeRequest {
    text?: string;
    url?: string;
    vietQrPayload?: string;
    imageBase64?: string;
    imageMime?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface XRayAnalysisResult {
    riskScore: number;
    level: XRayRiskLevel;
    scamCategory: string;
    verdict: string;
    elderlyVoiceScript: string;
    recommendedActions: string[];
    findings: XRayAgentFinding[];
    tier1Signals: {
        riskScore: number;
        flags: string[];
        vietQr: XRayVietQr | null;
    };
    engine: string;
    analyzedAt: string;
}
