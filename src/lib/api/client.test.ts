// Kiểm tra Axios interceptor thật với SecureStore và transport có điều khiển.
import {
    AxiosError,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    apiClient,
    endAuthSession,
    refreshAccessToken,
    storeAuthSession,
    subscribeSessionRevision,
} from '@/lib/api/client';
import { getAccessToken, getRefreshToken } from '@/lib/api/token-storage';

// Adapter mô phỏng HTTP nhưng giữ cách Axios ghép config, header và chạy interceptor.
const testIo = vi.hoisted(() => {
    const storage = new Map<string, string>();
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://127.0.0.1:4000/api');
    return {
        adapter:
            vi.fn<
                (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>
            >(),
        storage,
        getItemAsync: async (key: string) => storage.get(key) ?? null,
        setItemAsync: async (key: string, value: string) =>
            void storage.set(key, value),
        deleteItemAsync: async (key: string) => void storage.delete(key),
    };
});

vi.mock('expo-secure-store', () => testIo);
vi.mock('axios', async (importOriginal) => {
    const axios = await importOriginal<typeof import('axios')>();
    return {
        ...axios,
        create: (config: Parameters<typeof axios.create>[0]) =>
            axios.create({ ...config, adapter: testIo.adapter }),
    };
});

const firstTokens = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresIn: 900,
    tokenType: 'Bearer' as const,
};
const nextTokens = {
    ...firstTokens,
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
};

// Adapter Axios tự gửi lỗi HTTP để interceptor nhận đúng response/config.
function respond(
    config: InternalAxiosRequestConfig,
    status: number,
    data?: unknown,
) {
    const response = {
        config,
        status,
        data,
        statusText: String(status),
        headers: {},
    };
    if (status >= 400)
        throw new AxiosError(
            'HTTP request failed',
            undefined,
            config,
            undefined,
            response,
        );
    return response;
}

describe('native session lifecycle', () => {
    beforeEach(() => {
        testIo.adapter.mockReset();
        testIo.storage.clear();
    });

    // Refresh bị Core từ chối thu hồi cả socket và quyền dùng phản hồi thành công của epoch cũ.
    it('notifies session subscribers and discards delayed family data after a rejected refresh', async () => {
        await storeAuthSession(firstTokens);
        const delayed = Promise.withResolvers<void>();
        const notified = vi.fn();
        const unsubscribe = subscribeSessionRevision(notified);
        testIo.adapter.mockImplementation(async (config) => {
            if (config.url === '/auth/native/refresh')
                return respond(config, 401);
            await delayed.promise;
            return respond(config, 200, [{ id: 'old-family' }]);
        });
        const inFlight = apiClient.get('/families');
        void inFlight.catch(() => undefined);

        try {
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledOnce(),
            );
            await expect(refreshAccessToken()).rejects.toMatchObject({
                response: { status: 401 },
            });
            await expect(getAccessToken()).resolves.toBeNull();
            expect(notified).toHaveBeenCalledTimes(1);
            delayed.resolve();
            await expect(inFlight).rejects.toMatchObject({
                code: 'ERR_CANCELED',
            });
        } finally {
            delayed.resolve();
            unsubscribe();
        }
    });

    // Còn mạng thì logout chờ Core xác nhận. Nếu request thất bại, socket của phiên hiện tại được giữ.
    it('notifies revision listeners only after Core accepts logout and accepts unsubscribe', async () => {
        await storeAuthSession(firstTokens);
        const notified = vi.fn();
        const unsubscribe = subscribeSessionRevision(notified);
        testIo.adapter.mockImplementationOnce(async (config) =>
            respond(config, 503),
        );
        testIo.adapter.mockImplementationOnce(async (config) =>
            respond(config, 204),
        );

        try {
            await expect(endAuthSession()).rejects.toMatchObject({
                response: { status: 503 },
            });
            expect(notified).not.toHaveBeenCalled();
            await endAuthSession();
            expect(notified).toHaveBeenCalledTimes(1);
        } finally {
            unsubscribe();
        }
        await storeAuthSession(nextTokens);
        expect(notified).toHaveBeenCalledTimes(1);
    });

    // Family và Co-Sign dùng cùng Bearer/refresh với /me, giữ nguyên idempotency key sau một lần 401.
    it('refreshes a protected family mutation without changing its idempotency key', async () => {
        await storeAuthSession(firstTokens);
        testIo.adapter.mockImplementation(async (config) => {
            if (config.url === '/auth/native/refresh')
                return respond(config, 200, nextTokens);
            if (config.headers.get('Authorization') === 'Bearer access-1')
                return respond(config, 401);
            return respond(config, 201, { id: 'request' });
        });

        await expect(
            apiClient.post(
                '/families/demo/co-sign-requests',
                { amountVnd: 5_000_000 },
                {
                    headers: { 'Idempotency-Key': 'attempt' },
                },
            ),
        ).resolves.toMatchObject({ status: 201 });
        const writes = testIo.adapter.mock.calls
            .map(([config]) => config)
            .filter((config) => config.url?.endsWith('/co-sign-requests'));
        expect(
            writes.map(({ headers, data }) => [
                headers.get('Idempotency-Key'),
                JSON.parse(data),
            ]),
        ).toEqual([
            ['attempt', { amountVnd: 5_000_000 }],
            ['attempt', { amountVnd: 5_000_000 }],
        ]);
    });

    // Phản hồi thành công của user cũ không khôi phục dữ liệu nhạy cảm sau khi đổi phiên.
    it('cancels a family result from the old account even when Core returned 200', async () => {
        await storeAuthSession(firstTokens);
        const delayed = Promise.withResolvers<void>();
        testIo.adapter.mockImplementation(async (config) => {
            expect(config.headers.get('Authorization')).toBe('Bearer access-1');
            await delayed.promise;
            return respond(config, 200, [{ id: 'old-family' }]);
        });
        const response = apiClient.get('/families');
        void response.catch(() => undefined);
        try {
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledOnce(),
            );
            await storeAuthSession(nextTokens);
        } finally {
            delayed.resolve();
        }
        await expect(response).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    });

    // Một access đã hết hạn trong kho xuất hiện khi người dùng mở app sau một thời gian.
    it('restores an expired access token and retries concurrent requests using one rotation', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
        await storeAuthSession({ ...firstTokens, expiresIn: 1 });
        now.mockReturnValue(2_001);
        const rotation = Promise.withResolvers<void>();

        try {
            testIo.adapter.mockImplementation(async (config) => {
                expect(config.withCredentials).toBe(false);
                if (config.url === '/auth/native/refresh') {
                    expect(JSON.parse(config.data)).toEqual({
                        refreshToken: 'refresh-1',
                    });
                    await rotation.promise;
                    return respond(config, 200, nextTokens);
                }
                return config.headers.get('Authorization') === 'Bearer access-2'
                    ? respond(config, 200, { id: 'account-a' })
                    : respond(config, 401);
            });

            const requests = Promise.all([
                apiClient.get('/auth/me'),
                apiClient.get('/auth/me'),
            ]);
            await vi.waitFor(() =>
                expect(
                    testIo.adapter.mock.calls.filter(
                        ([config]) => config.url === '/auth/me',
                    ),
                ).toHaveLength(2),
            );
            rotation.resolve();
            await expect(requests).resolves.toMatchObject([
                { data: { id: 'account-a' } },
                { data: { id: 'account-a' } },
            ]);
            const configs = testIo.adapter.mock.calls.map(([config]) => config);
            expect(
                configs.filter(
                    (config) => config.url === '/auth/native/refresh',
                ),
            ).toHaveLength(1);
            expect(
                configs.filter((config) => config.url === '/auth/me'),
            ).toHaveLength(4);
            await expect(getAccessToken()).resolves.toBe('access-2');
            await expect(getRefreshToken()).resolves.toBe('refresh-2');
        } finally {
            rotation.resolve();
            now.mockRestore();
        }
    });

    // Một 401 đến muộn phải dùng token mới mà các request khác đã xoay.
    it('reuses a newer access token when an old 401 arrives late', async () => {
        await storeAuthSession(firstTokens);
        const delayed = Promise.withResolvers<void>();
        let first = true;

        testIo.adapter.mockImplementation(async (config) => {
            if (config.url === '/auth/native/refresh')
                return respond(config, 200, nextTokens);
            if (config.headers.get('Authorization') === 'Bearer access-2')
                return respond(config, 200);
            if (first) {
                first = false;
                await delayed.promise;
            }
            return respond(config, 401);
        });

        const lateRequest = apiClient.get('/auth/me');
        try {
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledOnce(),
            );
            await expect(apiClient.get('/auth/me')).resolves.toMatchObject({
                status: 200,
            });
            delayed.resolve();
            await expect(lateRequest).resolves.toMatchObject({ status: 200 });
            expect(
                testIo.adapter.mock.calls.filter(
                    ([config]) => config.url === '/auth/native/refresh',
                ),
            ).toHaveLength(1);
        } finally {
            delayed.resolve();
        }
    });

    // Nếu Core tiếp tục trả 401 sau retry thì interceptor dừng.
    it('does not loop after the authenticated retry returns 401', async () => {
        await storeAuthSession(firstTokens);
        testIo.adapter.mockImplementation(async (config) =>
            config.url === '/auth/native/refresh'
                ? respond(config, 200, nextTokens)
                : respond(config, 401),
        );

        await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
            response: { status: 401 },
        });
        expect(testIo.adapter.mock.calls.map(([config]) => config.url)).toEqual(
            ['/auth/me', '/auth/native/refresh', '/auth/me'],
        );
    });

    // Phiên bị thu hồi phải mất khỏi kho để app không tự đăng nhập lại khi mở lại.
    it('clears both credentials when Core rejects the refresh token', async () => {
        await storeAuthSession(firstTokens);
        testIo.adapter.mockImplementation(async (config) =>
            respond(config, 401),
        );

        await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
            response: { status: 401 },
        });
        await expect(getAccessToken()).resolves.toBeNull();
        await expect(getRefreshToken()).resolves.toBeNull();
        await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
            response: { status: 401 },
        });
        expect(
            testIo.adapter.mock.calls.filter(
                ([config]) => config.url === '/auth/native/refresh',
            ),
        ).toHaveLength(1);
    });

    // Sự cố mạng tạm thời không phải bằng chứng phiên backend đã bị thu hồi.
    it('keeps the refresh token on an upstream failure', async () => {
        await storeAuthSession(firstTokens);
        testIo.adapter.mockImplementation(async (config) =>
            respond(config, config.url === '/auth/native/refresh' ? 503 : 401),
        );

        await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
            response: { status: 503 },
        });
        await expect(getRefreshToken()).resolves.toBe('refresh-1');
    });

    // Token trả về muộn sau thao tác thu hồi không được làm sống lại phiên trên máy.
    it('revokes the current family and clears storage when logout overlaps refresh', async () => {
        await storeAuthSession(firstTokens);
        const rotation = Promise.withResolvers<void>();
        testIo.adapter.mockImplementation(async (config) => {
            if (config.url === '/auth/native/refresh') {
                await rotation.promise;
                return respond(config, 200, nextTokens);
            }
            if (config.url === '/auth/native/logout') {
                expect(JSON.parse(config.data)).toEqual({
                    refreshToken: 'refresh-1',
                });
                return respond(config, 204);
            }
            return respond(config, 401);
        });

        const profile = expect(apiClient.get('/auth/me')).rejects.toMatchObject(
            { response: { status: 401 } },
        );
        try {
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledTimes(2),
            );
            const logout = endAuthSession();
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledTimes(3),
            );
            rotation.resolve();
            await Promise.all([logout, profile]);
            await expect(getRefreshToken()).resolves.toBeNull();
            await expect(getAccessToken()).resolves.toBeNull();
        } finally {
            rotation.resolve();
        }
    });

    // Khi logout gặp lỗi mạng, refresh đã xoay phải được giữ để phiên còn dùng được.
    it('keeps a successful rotation and retries the profile when overlapping logout fails', async () => {
        await storeAuthSession(firstTokens);
        const rotation = Promise.withResolvers<void>();
        const logoutResponse = Promise.withResolvers<void>();
        testIo.adapter.mockImplementation(async (config) => {
            if (config.url === '/auth/native/refresh') {
                await rotation.promise;
                return respond(config, 200, nextTokens);
            }
            if (config.url === '/auth/native/logout') {
                await logoutResponse.promise;
                throw new AxiosError('Network Error', 'ERR_NETWORK', config);
            }
            return config.headers.get('Authorization') === 'Bearer access-2'
                ? respond(config, 200, { id: 'account-a' })
                : respond(config, 401);
        });

        const profile = apiClient.get('/auth/me');
        void profile.catch(() => undefined);
        try {
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledTimes(2),
            );
            const refresh = refreshAccessToken();
            const logoutOutcome = endAuthSession().then(
                () => null,
                (error: unknown) => error,
            );
            await vi.waitFor(() =>
                expect(testIo.adapter).toHaveBeenCalledTimes(3),
            );

            // Core trả token mới trước khi kết quả logout bị lỗi mạng đến thiết bị.
            rotation.resolve();
            await expect(refresh).resolves.toEqual(nextTokens);
            await expect(getRefreshToken()).resolves.toBe('refresh-2');
            expect(testIo.adapter).toHaveBeenCalledTimes(3);

            logoutResponse.resolve();
            await expect(logoutOutcome).resolves.toMatchObject({
                code: 'ERR_NETWORK',
            });
            await expect(profile).resolves.toMatchObject({
                data: { id: 'account-a' },
            });
            expect(testIo.adapter).toHaveBeenCalledTimes(4);
        } finally {
            rotation.resolve();
            logoutResponse.resolve();
        }
    });
});
