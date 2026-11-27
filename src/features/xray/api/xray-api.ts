// Gọi POST /api/xray/analyze trên KinShield-Core thông qua client đã gắn Bearer + refresh.
import { apiClient } from '@/lib/api/client';
import type {
    XRayAnalysisResult,
    XRayAnalyzeRequest,
} from '@/features/xray/types/xray';

export const xrayApi = {
    async analyze(payload: XRayAnalyzeRequest): Promise<XRayAnalysisResult> {
        return (
            await apiClient.post<XRayAnalysisResult>('/xray/analyze', payload)
        ).data;
    },
};
