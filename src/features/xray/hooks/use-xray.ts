// Hook React Query gửi yêu cầu soi Lớp 1 X-Ray lên KinShield-Core.
import { useMutation } from '@tanstack/react-query';
import { xrayApi } from '@/features/xray/api/xray-api';
import type { XRayAnalyzeRequest } from '@/features/xray/types/xray';

export function useAnalyzeXRay() {
    return useMutation({
        mutationFn: (payload: XRayAnalyzeRequest) => xrayApi.analyze(payload),
    });
}
