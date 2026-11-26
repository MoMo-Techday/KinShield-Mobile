// Khóa query tách theo user và family để mọi lần đồng bộ đúng phạm vi.
import { isAxiosError } from 'axios';
import { sessionDataKey } from '@/lib/api/session-query';

export const familyKeys = {
    // Dữ liệu người dùng cũ bị hủy theo prefix chung khi phiên đổi.
    all: (userId: string) => [...sessionDataKey, userId] as const,
    // Danh sách chỉ chứa membership active của tài khoản hiện tại.
    list: (userId: string) => [...familyKeys.all(userId), 'families'] as const,
    // Nhóm chi tiết và Co-Sign của cùng gia đình để invalidate khi reconnect.
    scope: (userId: string, familyId: string) =>
        [...familyKeys.all(userId), 'family', familyId] as const,
    // Chi tiết quyền tách khỏi nhánh request để chỉ cập nhật khi cần.
    membership: (userId: string, familyId: string) =>
        [...familyKeys.scope(userId, familyId), 'membership'] as const,
};

// Mạng hoặc 5xx có thể tự thử lại một lần. Mất quyền và hết phiên cần hiển thị ngay.
export function retryFamilyQuery(failures: number, error: unknown): boolean {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return failures < 1 && (status === undefined || status >= 500);
}
