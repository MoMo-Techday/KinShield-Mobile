// Mọi thao tác gia đình dùng Bearer và cơ chế refresh của client Core chung.
import { apiClient } from '@/lib/api/client';
import type {
    FamilyDetails,
    FamilyInvitation,
    FamilySummary,
} from '@/features/family/types/family';

export const familyApi = {
    // Khôi phục đầy đủ danh sách theo tài khoản, kể cả trên thiết bị mới.
    async list(signal?: AbortSignal) {
        return (await apiClient.get<FamilySummary[]>('/families', { signal }))
            .data;
    },
    // Quyền và các thành viên active được Core xác nhận lại ở mỗi lần đọc.
    async get(familyId: string, signal?: AbortSignal) {
        return (
            await apiClient.get<FamilyDetails>(`/families/${familyId}`, {
                signal,
            })
        ).data;
    },
    // Người tạo tự nhận role PARENT theo tài khoản đã đăng nhập.
    async create(name: string) {
        return (await apiClient.post<FamilyDetails>('/families', { name }))
            .data;
    },
    // Mã được truyền trong body để không xuất hiện trên URL.
    async accept(code: string) {
        return (
            await apiClient.post<FamilyDetails>(
                '/families/invitations/accept',
                { code },
            )
        ).data;
    },
    // Mã thô chỉ có trong lần phát; màn hình giữ tạm để người dùng chia sẻ.
    async invite(familyId: string) {
        return (
            await apiClient.post<FamilyInvitation>(
                `/families/${familyId}/invitations`,
            )
        ).data;
    },
    // Ghi mức VND nguyên; Core kiểm tra quyền PARENT và khoảng hợp lệ.
    async updateThreshold(familyId: string, thresholdVnd: number) {
        return (
            await apiClient.patch<FamilyDetails>(
                `/families/${familyId}/threshold`,
                { thresholdVnd },
            )
        ).data;
    },
    // Chuyển ID membership để Core thu hồi cả quyền đọc và subscription.
    async removeGuardian(familyId: string, membershipId: string) {
        await apiClient.delete(`/families/${familyId}/members/${membershipId}`);
    },
};
