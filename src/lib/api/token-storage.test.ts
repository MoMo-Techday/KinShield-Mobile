import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearAccessToken,
    getAccessToken,
    getRefreshToken,
    saveAccessToken,
} from './token-storage';

const secureStore = vi.hoisted(() => {
    const values = new Map<string, string>();
    return {
        values,
        getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
        setItemAsync: vi.fn(async (key: string, value: string) => {
            values.set(key, value);
        }),
        deleteItemAsync: vi.fn(async (key: string) => {
            values.delete(key);
        }),
    };
});

vi.mock('expo-secure-store', () => secureStore);

describe('native session storage', () => {
    beforeEach(() => {
        secureStore.values.clear();
        vi.spyOn(Date, 'now').mockReturnValue(1_000);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Một lần ghi giữ access/refresh cùng vòng đời, kể cả lúc app bị đóng.
    it('stores both credentials with the access token expiry', async () => {
        await saveAccessToken('access-token', 900, 'refresh-token');

        await expect(getAccessToken()).resolves.toBe('access-token');
        await expect(getRefreshToken()).resolves.toBe('refresh-token');
        expect(secureStore.setItemAsync).toHaveBeenCalledWith(
            'kinshield_access_token',
            JSON.stringify({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiresAt: 901_000,
            }),
        );
    });

    // Access hết hạn vẫn phải còn refresh để mô phỏng khôi phục phiên sau khi mở app.
    it('rejects an expired access token while keeping the refresh token', async () => {
        await saveAccessToken('access-token', 1, 'refresh-token');
        vi.spyOn(Date, 'now').mockReturnValue(2_001);

        await expect(getAccessToken()).resolves.toBeNull();
        await expect(getRefreshToken()).resolves.toBe('refresh-token');
    });

    // Dữ liệu phiên cũ chỉ có access token nên cần login để tạo refresh family mới.
    it('ignores a legacy access-only record', async () => {
        secureStore.values.set(
            'kinshield_access_token',
            JSON.stringify({ token: 'legacy-token', expiresAt: 2_000 }),
        );
        vi.spyOn(Date, 'now').mockReturnValue(1_001);

        await expect(getAccessToken()).resolves.toBeNull();
        await expect(getRefreshToken()).resolves.toBeNull();
    });

    // Sau logout không được còn credential để phiên tự mở lại.
    it('clears both stored credentials', async () => {
        await saveAccessToken('access-token', 900, 'refresh-token');

        await clearAccessToken();

        expect(secureStore.values.size).toBe(0);
    });
});
