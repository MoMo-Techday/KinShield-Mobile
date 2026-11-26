// Kiểm tra luồng socket Mobile bằng hook thật và điều khiển được thời điểm AppState, token, event.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoSignRealtime } from '@/features/co-sign/hooks/use-co-sign-realtime';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import { familyKeys } from '@/features/family/utils/family-queries';

const harness = vi.hoisted(() => {
    vi.stubEnv('EXPO_PUBLIC_WS_URL', 'http://127.0.0.1:4000');
    type Handler = (...args: unknown[]) => void;
    const listeners = new Map<string, Handler>();
    const appState = {
        currentState: 'active' as string | null,
        addEventListener: vi.fn(),
    };
    const socket = {
        connected: false,
        auth: {},
        on: vi.fn<(event: string, listener: Handler) => void>(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
    };
    return {
        appState,
        socket,
        listeners,
        stateListener: undefined as ((state: string) => void) | undefined,
        cleanup: undefined as (() => void) | undefined,
        revisionListener: undefined as (() => void) | undefined,
        revision: 1,
        getAccessToken: vi.fn<() => Promise<string | null>>(),
        refreshAccessToken: vi.fn(),
        invalidateQueries: vi.fn(),
        getQueryData: vi.fn(),
    };
});

vi.mock('react', () => ({
    useEffect: (effect: () => (() => void) | undefined) => {
        harness.cleanup = effect();
    },
}));
vi.mock('react-native', () => ({ AppState: harness.appState }));
vi.mock('socket.io-client', () => ({ io: () => harness.socket }));
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: harness.invalidateQueries,
        getQueryData: harness.getQueryData,
    }),
}));
vi.mock('@/lib/api/client', () => ({
    getSessionRevision: () => harness.revision,
    refreshAccessToken: harness.refreshAccessToken,
    subscribeSessionRevision: (listener: () => void) => {
        harness.revisionListener = listener;
        return () => {
            harness.revisionListener = undefined;
        };
    },
}));
vi.mock('@/lib/api/token-storage', () => ({
    getAccessToken: harness.getAccessToken,
}));

const user = 'account-a';
const family = 'family-a';
const requestId = '65a1214d-1b1c-4813-93bb-c7ca263e7f44';

// Gửi đổi AppState qua cùng callback mà React Native sẽ gọi.
function changeState(state: string) {
    harness.appState.currentState = state;
    harness.stateListener?.(state);
}

beforeEach(() => {
    vi.clearAllMocks();
    harness.revision = 1;
    harness.revisionListener = undefined;
    harness.stateListener = undefined;
    harness.appState.currentState = 'active';
    harness.socket.connected = false;
    harness.socket.auth = {};
    harness.listeners.clear();
    harness.socket.on.mockImplementation((event, listener) => {
        harness.listeners.set(event, listener);
    });
    harness.appState.addEventListener.mockImplementation(
        (_event, listener: (state: string) => void) => {
            harness.stateListener = listener;
            return {
                remove: () => {
                    harness.stateListener = undefined;
                },
            };
        },
    );
    harness.getAccessToken.mockReset().mockResolvedValue('token-a');
    harness.refreshAccessToken.mockReset();
    harness.getQueryData.mockReset();
});

afterEach(() => {
    harness.cleanup?.();
    harness.cleanup = undefined;
});

describe('Co-Sign socket lifecycle', () => {
    // Kết thúc đọc token sau khi app inactive không được mở lại socket đã đóng.
    it('keeps the socket closed while the app is inactive during token reads', async () => {
        const jwt = Promise.withResolvers<string | null>();
        harness.getAccessToken.mockReturnValueOnce(jwt.promise);
        useCoSignRealtime(user, family, true);

        changeState('inactive');
        jwt.resolve('token-a');
        await jwt.promise;
        expect(harness.socket.connect).not.toHaveBeenCalled();

        changeState('active');
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledTimes(1),
        );
    });

    // Cache chi tiết có thể cập nhật trước socket nhưng lịch sử vẫn cần sự kiện để lấy lại trạng thái.
    it('refreshes the list when the same version already reached the detail cache', async () => {
        harness.getQueryData.mockReturnValue({ snapshot: { version: 2 } });
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );

        const event = { requestId, version: 2, status: 'APPROVED' };
        harness.listeners.get('co_sign.updated')?.(event);
        harness.listeners.get('co_sign.updated')?.(event);
        expect(harness.invalidateQueries.mock.calls).toEqual([
            [{ queryKey: coSignKeys.list(user, family) }],
        ]);
    });

    // Logout/đổi phiên phải ngắt transport cũ ngay cả khi layout chưa cleanup.
    it('closes the previous account socket as soon as the session changes', async () => {
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        harness.revision++;
        harness.revisionListener?.();
        expect(harness.socket.disconnect).toHaveBeenCalledTimes(1);
        expect(harness.socket.auth).toEqual({});

        changeState('active');
        expect(harness.socket.connect).toHaveBeenCalledTimes(1);
        expect(harness.invalidateQueries).not.toHaveBeenCalled();
    });

    // Socket mất mạng bỏ lỡ event; kết nối mới đọc lại membership, lịch sử và chi tiết qua key chung.
    it('invalidates the family snapshot and discovery after a reconnect', async () => {
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        harness.listeners.get('connect')?.();
        harness.invalidateQueries.mockClear();

        harness.listeners.get('disconnect')?.('transport close');
        harness.listeners.get('connect')?.();
        expect(harness.invalidateQueries.mock.calls).toEqual([
            [{ queryKey: familyKeys.scope(user, family) }],
            [{ queryKey: familyKeys.list(user) }],
        ]);
    });

    // Refresh bắt đầu ở phiên cũ có thể trả về sau logout, khi layout mới chưa mount.
    // Kết quả về muộn không được mở transport hay mang token trở lại socket đã dọn.
    it('discards a refresh that finishes after the account socket was disposed', async () => {
        const refresh = Promise.withResolvers<{ accessToken: string }>();
        harness.refreshAccessToken.mockReturnValueOnce(refresh.promise);
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );

        harness.listeners.get('connect_error')?.({
            data: { code: 'UNAUTHORIZED' },
        });
        await vi.waitFor(() =>
            expect(harness.refreshAccessToken).toHaveBeenCalledOnce(),
        );
        harness.revision++;
        harness.revisionListener?.();
        refresh.resolve({ accessToken: 'token-for-old-account' });
        await refresh.promise;

        expect(harness.socket.connect).toHaveBeenCalledTimes(1);
        expect(harness.socket.auth).toEqual({});
        expect(harness.invalidateQueries).not.toHaveBeenCalled();
    });

    // Event v1 đến sau v2 không được invalidate lại UI khi HTTP đang lấy kết quả mới.
    it('ignores an older event without refreshing the list or detail twice', async () => {
        harness.getQueryData.mockReturnValue({ snapshot: { version: 1 } });
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );

        const update = harness.listeners.get('co_sign.updated');
        update?.({ requestId, version: 2, status: 'BLOCKED' });
        update?.({ requestId, version: 1, status: 'PENDING_REVIEW' });

        expect(harness.invalidateQueries.mock.calls).toEqual([
            [{ queryKey: coSignKeys.detail(user, family, requestId) }],
            [{ queryKey: coSignKeys.list(user, family) }],
        ]);
    });

    // HTTP đã xoay token trong lúc mất kết nối thì handshake dùng token mới mà không xoay lần nữa.
    it('reuses the latest HTTP token after an unauthorized reconnect', async () => {
        useCoSignRealtime(user, family, true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        harness.getAccessToken.mockResolvedValue('token-b');

        harness.listeners.get('connect_error')?.({
            data: { code: 'UNAUTHORIZED' },
        });
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledTimes(2),
        );
        expect(harness.socket.auth).toEqual({
            familyId: family,
            token: 'token-b',
        });
        expect(harness.refreshAccessToken).not.toHaveBeenCalled();
    });
});
