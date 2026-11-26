// Dữ liệu riêng từ Core dùng chung prefix để dọn khi phiên đăng nhập đổi chủ.
import type { QueryClient } from '@tanstack/react-query';

export const sessionDataKey = ['session-data'] as const;

// Hủy request rồi xóa cache riêng tư để dữ liệu phiên cũ không quay lại sau logout.
export async function clearSessionQueries(client: QueryClient): Promise<void> {
    await client.cancelQueries({ queryKey: sessionDataKey });
    client.removeQueries({ queryKey: sessionDataKey });
}
