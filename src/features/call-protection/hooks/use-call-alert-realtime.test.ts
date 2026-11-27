import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCallAlertRealtime } from '@/features/call-protection/hooks/use-call-alert-realtime';
import { callAlertKeys } from '@/features/call-protection/utils/call-protection-queries';

const harness = vi.hoisted(() => {
    vi.stubEnv('EXPO_PUBLIC_WS_URL', 'https://api.example.test');
    type Handler = (...args: unknown[]) => void;
    const listeners = new Map<string, Handler>();
    const socket = {
        connected: false,
        auth: {} as Record<string, unknown>,
        on: vi.fn((event: string, listener: Handler) => {
            listeners.set(event, listener);
            return socket;
        }),
        connect: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
    };
    return {
        socket,
        listeners,
        appState: {
            currentState: 'active' as string | null,
            addEventListener: vi.fn(),
        },
        stateListener: undefined as ((state: string) => void) | undefined,
        cleanup: undefined as (() => void) | undefined,
        revisionListener: undefined as (() => void) | undefined,
        revision: 1,
        getAccessToken: vi.fn<() => Promise<string | null>>(),
        refreshAccessToken: vi.fn(),
        invalidateQueries: vi.fn(),
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
    useQueryClient: () => ({ invalidateQueries: harness.invalidateQueries }),
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

function fire(event: string, ...args: unknown[]) {
    harness.listeners.get(event)?.(...args);
}

function changeState(state: string) {
    harness.appState.currentState = state;
    harness.stateListener?.(state);
}

beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_WS_URL', 'https://api.example.test');
    vi.clearAllMocks();
    harness.listeners.clear();
    harness.revision = 1;
    harness.revisionListener = undefined;
    harness.stateListener = undefined;
    harness.cleanup = undefined;
    harness.appState.currentState = 'active';
    harness.socket.connected = false;
    harness.socket.auth = {};
    harness.socket.on.mockImplementation((event, listener) => {
        harness.listeners.set(event, listener);
        return harness.socket;
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
    harness.refreshAccessToken.mockReset().mockResolvedValue({
        accessToken: 'token-b',
    });
});

afterEach(() => {
    harness.cleanup?.();
    harness.cleanup = undefined;
});

describe('Guardian call alert realtime invalidation', () => {
    it('connects to the monitor namespace and invalidates only on valid alert metadata', async () => {
        useCallAlertRealtime('user-a', 'family-a', true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        fire('connect');
        expect(harness.socket.auth).toEqual({
            familyId: 'family-a',
            token: 'token-a',
        });
        expect(harness.invalidateQueries).toHaveBeenCalledWith({
            queryKey: callAlertKeys.list('user-a', 'family-a'),
        });

        harness.invalidateQueries.mockClear();
        fire('call_alert.created', {
            alertId: 'opaque-alert-id',
            version: 1,
            occurredAt: '2026-11-27T04:30:00.000Z',
        });
        expect(harness.invalidateQueries).toHaveBeenCalledWith({
            queryKey: callAlertKeys.list('user-a', 'family-a'),
        });
        harness.invalidateQueries.mockClear();
        fire('call_alert.created', { alertId: 42, version: 1 });
        expect(harness.invalidateQueries).not.toHaveBeenCalled();
    });

    it('revalidates on reconnect and foreground and closes after session revision changes', async () => {
        useCallAlertRealtime('user-a', 'family-a', true);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        fire('connect');
        harness.invalidateQueries.mockClear();

        fire('disconnect', 'io server disconnect');
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledTimes(2),
        );
        fire('connect');
        expect(harness.invalidateQueries).toHaveBeenCalledWith({
            queryKey: callAlertKeys.list('user-a', 'family-a'),
        });

        harness.invalidateQueries.mockClear();
        changeState('background');
        changeState('active');
        expect(harness.invalidateQueries).toHaveBeenCalledWith({
            queryKey: callAlertKeys.list('user-a', 'family-a'),
        });
        harness.revision += 1;
        harness.revisionListener?.();
        expect(harness.socket.disconnect).toHaveBeenCalled();
        expect(harness.socket.auth).toEqual({});
    });
});
