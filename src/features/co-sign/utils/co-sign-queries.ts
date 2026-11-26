// Khóa cache Co-Sign gắn với danh tính và gia đình, dùng chung giữa HTTP và socket.
import { familyKeys } from '@/features/family/utils/family-queries';

export const coSignKeys = {
    // Cả danh sách và chi tiết phải được đồng bộ sau khi mở lại kết nối.
    all: (userId: string, familyId: string) =>
        [...familyKeys.scope(userId, familyId), 'co-sign'] as const,
    // Danh sách giữ cursor riêng, không ghi snapshot từ event vào cache.
    list: (userId: string, familyId: string) =>
        [...coSignKeys.all(userId, familyId), 'list'] as const,
    // Mỗi request có version và giờ server riêng.
    detail: (userId: string, familyId: string, requestId: string) =>
        [...coSignKeys.all(userId, familyId), 'detail', requestId] as const,
};
