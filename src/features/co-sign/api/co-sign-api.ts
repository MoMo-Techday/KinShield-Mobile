// HTTP là nguồn trạng thái có thẩm quyền; timestamp đơn điệu neo đồng hồ theo từng response.
import { apiClient } from '@/lib/api/client';
import type {
    CoSignAction,
    CoSignDetail,
    CoSignPage,
    SimulationAttempt,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

// Dùng cùng collection cho list, tạo và xác định đường dẫn của từng yêu cầu.
function requestPath(familyId: string) {
    return `/families/${familyId}/co-sign-requests`;
}

export const coSignApi = {
    // Trang đầu và cursor dùng cùng role đang gắn với Bearer.
    async list(
        familyId: string,
        cursor?: string | null,
        signal?: AbortSignal,
    ): Promise<TimedCoSign<CoSignPage>> {
        const requestedAt = performance.now();
        const { data } = await apiClient.get<CoSignPage>(
            requestPath(familyId),
            { params: { cursor }, signal },
        );
        return { snapshot: data, requestedAt };
    },
    // GET luôn trả giờ server và deadline cho màn chi tiết.
    async detail(
        familyId: string,
        requestId: string,
        signal?: AbortSignal,
    ): Promise<TimedCoSign<CoSignDetail>> {
        const requestedAt = performance.now();
        const { data } = await apiClient.get<CoSignDetail>(
            `${requestPath(familyId)}/${requestId}`,
            { signal },
        );
        return { snapshot: data, requestedAt };
    },
    // Retry nhận cùng key và payload đã ghi để một giao dịch chỉ có một yêu cầu.
    async create(
        familyId: string,
        attempt: SimulationAttempt,
    ): Promise<TimedCoSign<CoSignDetail>> {
        const requestedAt = performance.now();
        const { data } = await apiClient.post<CoSignDetail>(
            requestPath(familyId),
            attempt.transfer,
            {
                headers: { 'Idempotency-Key': attempt.key },
            },
        );
        return { snapshot: data, requestedAt };
    },
    // Gửi đúng action đã xác nhận. Khi kết quả chưa rõ, luồng UI đọc lại trước khi gửi tiếp.
    async decide(
        familyId: string,
        requestId: string,
        action: CoSignAction,
    ): Promise<TimedCoSign<CoSignDetail>> {
        const requestedAt = performance.now();
        const { data } = await apiClient.put<CoSignDetail>(
            `${requestPath(familyId)}/${requestId}/decision`,
            { action },
        );
        return { snapshot: data, requestedAt };
    },
};
