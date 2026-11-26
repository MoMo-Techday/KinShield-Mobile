// Một subscription cho mỗi layout family. Socket chỉ báo hiệu, dữ liệu luôn đọc lại qua REST.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
    getSessionRevision,
    refreshAccessToken,
    subscribeSessionRevision,
} from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/token-storage';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import { familyKeys } from '@/features/family/utils/family-queries';
import { isNewUpdate } from '@/features/co-sign/utils/co-sign-state';
import { isUncertainError } from '@/features/co-sign/utils/co-sign-errors';
import type {
    CoSignDetail,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

const origin = process.env.EXPO_PUBLIC_WS_URL?.replace(/\/+$/, '');

// Mở đúng room của phiên hiện tại. Reconnect, foreground và thu hồi đều đối chiếu quyền qua HTTP.
// Khi JWT bị từ chối, dùng token HTTP đã xoay nếu có, rồi mới thử refresh chung một lần.
// Đổi phiên sẽ ngắt socket ngay. Kiểm tra lại trạng thái sau mỗi lần chờ đọc credential.
export function useCoSignRealtime(
    userId: string,
    familyId: string,
    enabled: boolean,
) {
    const client = useQueryClient();

    useEffect(() => {
        if (!origin || !enabled) return;
        const revision = getSessionRevision();
        const socket = io(`${origin}/family`, {
            autoConnect: false,
            forceNew: true,
            // React Native tự thêm Origin vào WebSocket. Polling thiết lập phiên trước khi nâng cấp.
            transports: ['polling', 'websocket'],
            tryAllTransports: true,
        });
        const seen = new Map<string, number>();
        let disposed = false;
        let connecting = false;
        let triedRefresh = false;
        let lastHandshakeToken: string | undefined;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let foreground =
            AppState.currentState === 'active' ||
            AppState.currentState === null;

        // Từ chối event/refresh cũ ngay cả nếu effect cleanup chưa chạy trong lần đổi tài khoản.
        const isCurrent = () => !disposed && getSessionRevision() === revision;
        // App iOS cũng đi qua inactive. Chỉ hoạt động lại khi AppState báo active.
        const canConnect = () => isCurrent() && foreground;

        // HTTP xác nhận lại quyền trước khi UI tiếp tục dùng cache sau gián đoạn.
        const synchronize = () => {
            if (!isCurrent()) return;
            void client.invalidateQueries({
                queryKey: familyKeys.scope(userId, familyId),
            });
            void client.invalidateQueries({
                queryKey: familyKeys.list(userId),
            });
        };

        // Lỗi trước handshake chưa có Manager tự reconnect, nên đặt một lần thử có khoảng chờ.
        function deferStart(forceRefresh = false) {
            if (retryTimer || !canConnect()) return;
            retryTimer = setTimeout(() => {
                retryTimer = undefined;
                void start(forceRefresh);
            }, 4_000);
        }

        // Dừng lần thử đang hẹn khi đã kết nối, app rời foreground hoặc user đổi phiên.
        function clearRetry() {
            clearTimeout(retryTimer);
            retryTimer = undefined;
        }

        // Native có thể đã vượt expiry trong lúc app nền. Dùng refresh chung để tránh xoay hai lần.
        async function start(replaceRejectedToken = false) {
            if (!canConnect() || connecting || socket.connected) return;
            connecting = true;
            try {
                const existing = await getAccessToken();
                if (!canConnect()) return;
                // HTTP có thể đã làm mới token lúc socket offline, dùng cặp mới trước khi xoay tiếp.
                const token =
                    existing &&
                    (!replaceRejectedToken || existing !== lastHandshakeToken)
                        ? existing
                        : (await refreshAccessToken())?.accessToken;
                if (!canConnect() || !token) return;
                lastHandshakeToken = token;
                socket.auth = { familyId, token };
                socket.connect();
            } catch (error) {
                // REST chịu trách nhiệm hiển thị mất mạng hoặc hết phiên. Khi có kết nối sẽ đọc lại.
                synchronize();
                if (isUncertainError(error)) deferStart(replaceRejectedToken);
            } finally {
                connecting = false;
            }
        }

        // Kết nối mới có thể đã bỏ lỡ nhiều event. Reset cache event và lấy snapshot chuẩn.
        socket.on('connect', () => {
            clearRetry();
            triedRefresh = false;
            seen.clear();
            synchronize();
        });

        // Từ chối theo phiên có thể do JWT hết hạn. Thiếu membership chỉ làm mới quyền qua HTTP.
        socket.on(
            'connect_error',
            (error: Error & { data?: { code?: string } }) => {
                if (!canConnect()) return;
                const code = error.data?.code;
                if (code === 'UNAUTHORIZED' && !triedRefresh) {
                    triedRefresh = true;
                    void start(true);
                } else if (code) {
                    synchronize();
                    if (code === 'REALTIME_UNAVAILABLE') deferStart();
                }
            },
        );

        // Socket.IO không tự nối lại khi server chủ động đóng. JWT mới hoặc GET quyền sẽ quyết định bước tiếp.
        socket.on('disconnect', (reason) => {
            if (reason === 'io server disconnect') {
                synchronize();
                void start();
            }
        });

        // Chỉ dữ liệu từ GET được đưa vào UI. Bỏ event cũ/trùng và giới hạn số ID ghi nhớ.
        socket.on('co_sign.updated', (event: unknown) => {
            if (!canConnect() || !isNewUpdate(event, 0)) return;
            const key = coSignKeys.detail(userId, familyId, event.requestId);
            const cached = client.getQueryData<TimedCoSign<CoSignDetail>>(key);
            if (event.version <= (seen.get(event.requestId) ?? 0)) return;
            seen.set(event.requestId, event.version);
            if (seen.size > 128) {
                const oldest = seen.keys().next().value;
                if (oldest) seen.delete(oldest);
            }
            // Bản chi tiết có thể đã mới nhờ GET riêng. Lịch sử vẫn cần đọc lại theo sự kiện.
            if (event.version > (cached?.snapshot.version ?? 0))
                void client.invalidateQueries({ queryKey: key });
            void client.invalidateQueries({
                queryKey: coSignKeys.list(userId, familyId),
            });
        });

        const lifecycle = AppState.addEventListener('change', (state) => {
            // Khi ở nền không giữ subscription hoạt động. Foreground luôn đối chiếu snapshot.
            foreground = state === 'active';
            if (foreground) {
                triedRefresh = false;
                synchronize();
                if (!socket.connected) void start();
            } else {
                clearRetry();
                socket.disconnect();
            }
        });
        // Gỡ listener, timer và credential dù logout đến trước React cleanup.
        function dispose() {
            if (disposed) return;
            disposed = true;
            clearRetry();
            lifecycle.remove();
            unsubscribe();
            socket.removeAllListeners();
            socket.disconnect();
            socket.auth = {};
            lastHandshakeToken = undefined;
        }

        const unsubscribe = subscribeSessionRevision(dispose);
        void start();
        return dispose;
    }, [client, enabled, familyId, userId]);
}
