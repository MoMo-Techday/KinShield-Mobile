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
import { callAlertKeys } from '@/features/call-protection/utils/call-protection-queries';
import { isUncertainError } from '@/features/co-sign/utils/co-sign-errors';

const origin = process.env.EXPO_PUBLIC_WS_URL?.replace(/\/+$/, '');

function isCallAlertCreated(event: unknown): event is {
    alertId: string;
    version: 1;
    occurredAt: string;
} {
    if (typeof event !== 'object' || event === null || Array.isArray(event))
        return false;
    const candidate = event as Record<string, unknown>;
    return (
        typeof candidate.alertId === 'string' &&
        candidate.alertId.length > 0 &&
        candidate.version === 1 &&
        typeof candidate.occurredAt === 'string' &&
        Number.isFinite(Date.parse(candidate.occurredAt))
    );
}

export function useCallAlertRealtime(
    userId: string,
    familyId: string,
    enabled: boolean,
) {
    const client = useQueryClient();

    useEffect(() => {
        if (!origin || !enabled) return;
        const revision = getSessionRevision();
        const socket = io(`${origin}/call-monitor`, {
            autoConnect: false,
            forceNew: true,
            transports: ['polling', 'websocket'],
            tryAllTransports: true,
        });
        let disposed = false;
        let connecting = false;
        let triedRefresh = false;
        let lastHandshakeToken: string | undefined;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let foreground =
            AppState.currentState === 'active' ||
            AppState.currentState === null;

        const isCurrent = () =>
            !disposed && getSessionRevision() === revision;
        const canConnect = () => isCurrent() && foreground;

        function synchronize() {
            if (!isCurrent()) return;
            void client.invalidateQueries({
                queryKey: callAlertKeys.list(userId, familyId),
            });
        }

        function clearRetry() {
            clearTimeout(retryTimer);
            retryTimer = undefined;
        }

        function deferStart(forceRefresh = false) {
            if (retryTimer || !canConnect()) return;
            retryTimer = setTimeout(() => {
                retryTimer = undefined;
                void start(forceRefresh);
            }, 4_000);
        }

        async function start(replaceRejectedToken = false) {
            if (!canConnect() || connecting || socket.connected) return;
            connecting = true;
            try {
                const existing = await getAccessToken();
                if (!canConnect()) return;
                const token =
                    existing &&
                    (!replaceRejectedToken ||
                        existing !== lastHandshakeToken)
                        ? existing
                        : (await refreshAccessToken())?.accessToken;
                if (!canConnect() || !token) return;
                lastHandshakeToken = token;
                socket.auth = { familyId, token };
                socket.connect();
            } catch (error) {
                synchronize();
                if (isUncertainError(error))
                    deferStart(replaceRejectedToken);
            } finally {
                connecting = false;
            }
        }

        socket.on('connect', () => {
            clearRetry();
            triedRefresh = false;
            synchronize();
        });
        socket.on(
            'connect_error',
            (error: Error & { data?: { code?: string } }) => {
                if (!canConnect()) return;
                const code = error.data?.code;
                if (code === 'UNAUTHORIZED' && !triedRefresh) {
                    triedRefresh = true;
                    void start(true);
                } else if (code === 'REALTIME_UNAVAILABLE') {
                    deferStart();
                } else {
                    synchronize();
                }
            },
        );
        socket.on('disconnect', (reason) => {
            if (reason === 'io server disconnect') {
                synchronize();
                void start();
            }
        });
        socket.on('call_alert.created', (event: unknown) => {
            if (!canConnect() || !isCallAlertCreated(event)) return;
            synchronize();
        });

        const lifecycle = AppState.addEventListener('change', (state) => {
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
