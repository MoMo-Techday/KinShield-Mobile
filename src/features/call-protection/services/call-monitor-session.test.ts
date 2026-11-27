import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallAnalysisEvent } from '@/features/call-protection/types/call-protection';
import { createCallMonitorSession } from '@/features/call-protection/services/call-monitor-session';

const harness = vi.hoisted(() => {
    type Listener = (...args: unknown[]) => void;
    const listeners = new Map<string, Listener>();
    const socket = {
        auth: {} as Record<string, unknown>,
        connected: false,
        on: vi.fn((event: string, listener: Listener) => {
            listeners.set(event, listener);
            return socket;
        }),
        emit: vi.fn((_event: string, ..._args: unknown[]) => socket),
        connect: vi.fn(() => socket),
        disconnect: vi.fn(() => {
            socket.connected = false;
            return socket;
        }),
        removeAllListeners: vi.fn(() => {
            listeners.clear();
            return socket;
        }),
    };
    return {
        socket,
        listeners,
        io: vi.fn(),
        appStateListener: undefined as ((state: string) => void) | undefined,
        revisionListener: undefined as (() => void) | undefined,
        onFinalizedTranscript: undefined as
            | ((text: string) => void)
            | undefined,
        onInterrupted: undefined as (() => void) | undefined,
        revision: 1,
        getAccessToken: vi.fn<() => Promise<string | null>>(),
        refreshAccessToken: vi.fn(),
    };
});

vi.mock('socket.io-client', () => ({
    io: (...args: unknown[]) => harness.io(...args),
}));
vi.mock('react-native', () => ({
    AppState: {
        currentState: 'active',
        addEventListener: (
            _event: string,
            listener: (state: string) => void,
        ) => {
            harness.appStateListener = listener;
            return {
                remove: () => {
                    harness.appStateListener = undefined;
                },
            };
        },
    },
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
    if (event === 'connect') harness.socket.connected = true;
    if (event === 'disconnect') harness.socket.connected = false;
    harness.listeners.get(event)?.(...args);
}

function makeAnalysis(
    overrides: Partial<CallAnalysisEvent> = {},
): CallAnalysisEvent {
    return {
        sessionId: 'session-a',
        riskScore: 60,
        level: 'WARN',
        stage: 2,
        counterQuestion: null,
        voiceWarning: null,
        audio: null,
        audioStatus: 'not_requested',
        alertStatus: 'not_requested',
        ...overrides,
    };
}

function createHarnessSession() {
    const onStatus = vi.fn();
    const onAnalysis = vi.fn();
    const stopRecognition = vi.fn();
    const session = createCallMonitorSession({
        familyId: 'family-a',
        onStatus,
        onAnalysis,
        stopRecognition,
    });
    const startRecognition = vi.fn(
        async (
            onFinalizedTranscript: (text: string) => void,
            onInterrupted: () => void,
        ) => {
            harness.onFinalizedTranscript = onFinalizedTranscript;
            harness.onInterrupted = onInterrupted;
        },
    );
    return {
        session,
        onStatus,
        onAnalysis,
        startRecognition,
        stopRecognition,
    };
}

beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_WS_URL', 'https://api.example.test');
    harness.listeners.clear();
    harness.socket.connected = false;
    harness.socket.auth = {};
    harness.socket.emit.mockClear();
    harness.socket.connect.mockClear();
    harness.socket.disconnect.mockClear();
    harness.socket.removeAllListeners.mockClear();
    harness.socket.on.mockClear().mockImplementation((event, listener) => {
        harness.listeners.set(event, listener);
        return harness.socket;
    });
    harness.io.mockReset().mockReturnValue(harness.socket);
    harness.appStateListener = undefined;
    harness.revisionListener = undefined;
    harness.revision = 1;
    harness.getAccessToken.mockReset().mockResolvedValue('token-a');
    harness.refreshAccessToken.mockReset().mockResolvedValue({
        accessToken: 'token-b',
    });
    harness.onFinalizedTranscript = undefined;
    harness.onInterrupted = undefined;
});

async function startSession() {
    const values = createHarnessSession();
    const pending = values.session.start(values.startRecognition);

    await vi.waitFor(() =>
        expect(harness.socket.connect).toHaveBeenCalledOnce(),
    );
    expect(harness.socket.auth).toEqual({
        familyId: 'family-a',
        token: 'token-a',
    });
    fire('connect');
    await vi.waitFor(() =>
        expect(harness.socket.emit).toHaveBeenCalledWith('call.start', {}),
    );
    expect(values.startRecognition).not.toHaveBeenCalled();
    fire('call.started', { sessionId: 'session-a', nextSequence: 4 });
    await pending;
    expect(values.startRecognition).toHaveBeenCalledOnce();
    return values;
}

describe('call monitor session transport', () => {
    it('authenticates, starts the server session before recognition, sends redacted chunks, and stops', async () => {
        const values = createHarnessSession();
        const pending = values.session.start(values.startRecognition);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        fire('connect');
        await vi.waitFor(() =>
            expect(harness.socket.emit).toHaveBeenCalledWith(
                'call.start',
                {},
            ),
        );
        expect(values.startRecognition).not.toHaveBeenCalled();
        fire('call.started', { sessionId: 'session-a', nextSequence: 4 });
        await pending;

        expect(harness.io).toHaveBeenCalledWith(
            'https://api.example.test/call-monitor',
            expect.objectContaining({
                autoConnect: false,
                forceNew: true,
                reconnection: false,
                transports: ['polling', 'websocket'],
            }),
        );
        expect([...harness.listeners.keys()].sort()).toEqual(
            [
                'call.analysis',
                'call.error',
                'call.started',
                'call.stopped',
                'call.unavailable',
                'connect',
                'connect_error',
                'disconnect',
            ].sort(),
        );

        harness.onFinalizedTranscript?.('OTP 123456');
        await vi.waitFor(() =>
            expect(harness.socket.emit).toHaveBeenCalledWith('call.chunk', {
                sessionId: 'session-a',
                sequence: 4,
                transcriptChunk: 'OTP [REDACTED]',
            }),
        );
        fire('call.analysis', makeAnalysis());
        expect(values.onAnalysis).toHaveBeenCalledWith(makeAnalysis());

        await values.session.stop();
        expect(harness.socket.emit).toHaveBeenCalledWith('call.stop', {
            sessionId: 'session-a',
        });
        expect(values.onStatus).toHaveBeenLastCalledWith('stopped');
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
        expect(harness.listeners.size).toBe(0);
        expect(values.stopRecognition).toHaveBeenCalledOnce();
    });

    it('sends chunks one at a time and splits at Unicode code-point boundaries', async () => {
        const values = await startSession();
        harness.onFinalizedTranscript?.('😀'.repeat(1_001));

        await vi.waitFor(() =>
            expect(
                harness.socket.emit.mock.calls.filter(
                    ([event]) => event === 'call.chunk',
                ),
            ).toHaveLength(1),
        );
        const first = harness.socket.emit.mock.calls.find(
            ([event]) => event === 'call.chunk',
        )?.[1] as { sequence: number; transcriptChunk: string };
        expect(first.sequence).toBe(4);
        expect(first.transcriptChunk.length).toBe(2_000);
        expect([...first.transcriptChunk].every((part) => part === '😀')).toBe(
            true,
        );

        fire('call.analysis', makeAnalysis());
        await vi.waitFor(() =>
            expect(
                harness.socket.emit.mock.calls.filter(
                    ([event]) => event === 'call.chunk',
                ),
            ).toHaveLength(2),
        );
        const chunks = harness.socket.emit.mock.calls
            .filter(([event]) => event === 'call.chunk')
            .map(([, payload]) => payload as {
                sequence: number;
                transcriptChunk: string;
            });
        expect(chunks[1].sequence).toBe(5);
        expect(chunks[1].transcriptChunk).toBe('😀');
        expect(chunks.map((chunk) => chunk.transcriptChunk).join('')).toBe(
            '😀'.repeat(1_001),
        );
        await values.session.stop();
    });

    it('coalesces adjacent queued text without reordering it', async () => {
        const values = await startSession();
        harness.onFinalizedTranscript?.('first');
        await vi.waitFor(() =>
            expect(
                harness.socket.emit.mock.calls.filter(
                    ([event]) => event === 'call.chunk',
                ),
            ).toHaveLength(1),
        );
        harness.onFinalizedTranscript?.(' second');
        harness.onFinalizedTranscript?.(' third');

        fire('call.analysis', makeAnalysis());
        await vi.waitFor(() =>
            expect(
                harness.socket.emit.mock.calls.filter(
                    ([event]) => event === 'call.chunk',
                ),
            ).toHaveLength(2),
        );
        const chunks = harness.socket.emit.mock.calls
            .filter(([event]) => event === 'call.chunk')
            .map(([, payload]) => payload as { transcriptChunk: string });
        expect(chunks.map(({ transcriptChunk }) => transcriptChunk)).toEqual([
            'first',
            ' second third',
        ]);
        await values.session.stop();
    });

    it('degrades instead of overflowing the bounded queue', async () => {
        const values = await startSession();
        harness.onFinalizedTranscript?.('x'.repeat(18_001));

        await vi.waitFor(() =>
            expect(values.onStatus).toHaveBeenCalledWith('degraded'),
        );
        expect(
            harness.socket.emit.mock.calls.filter(
                ([event]) => event === 'call.chunk',
            ),
        ).toHaveLength(0);
        expect(values.startRecognition).toHaveBeenCalledOnce();
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
    });

    it('stops rather than submitting more than 30 chunks in a rolling minute', async () => {
        const values = await startSession();
        const sentChunks = () =>
            harness.socket.emit.mock.calls.filter(
                ([event]) => event === 'call.chunk',
            );

        for (let index = 0; index < 30; index += 1) {
            harness.onFinalizedTranscript?.(`chunk ${index}`);
            await vi.waitFor(() =>
                expect(sentChunks()).toHaveLength(index + 1),
            );
            fire('call.analysis', makeAnalysis());
        }

        await vi.waitFor(() =>
            expect(values.onStatus).toHaveBeenLastCalledWith('listening'),
        );
        harness.onFinalizedTranscript?.('chunk 31');
        await vi.waitFor(() =>
            expect(values.onStatus).toHaveBeenLastCalledWith('degraded'),
        );
        expect(sentChunks()).toHaveLength(30);
        expect(values.stopRecognition).toHaveBeenCalledOnce();
    });

    it('never resends an in-flight chunk after disconnect', async () => {
        const values = await startSession();
        harness.onFinalizedTranscript?.('hello');
        await vi.waitFor(() =>
            expect(harness.socket.emit).toHaveBeenCalledWith(
                'call.chunk',
                expect.objectContaining({ transcriptChunk: 'hello' }),
            ),
        );

        fire('disconnect', 'transport close');
        expect(values.onStatus).toHaveBeenCalledWith('degraded');
        expect(values.stopRecognition).toHaveBeenCalledOnce();
        expect(harness.socket.connect).toHaveBeenCalledOnce();
        fire('connect');
        expect(
            harness.socket.emit.mock.calls.filter(
                ([event]) => event === 'call.chunk',
            ),
        ).toHaveLength(1);
        expect(harness.listeners.size).toBe(0);
    });

    it('stops and clears the session when authorization changes', async () => {
        const values = await startSession();
        harness.revision += 1;
        harness.revisionListener?.();

        expect(values.onStatus).toHaveBeenLastCalledWith('stopped');
        expect(values.stopRecognition).toHaveBeenCalledOnce();
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
        expect(harness.socket.auth).toEqual({});
        expect(harness.listeners.size).toBe(0);
    });

    it('degrades and closes on a FORBIDDEN operation error', async () => {
        const values = await startSession();
        fire('call.error', { code: 'FORBIDDEN', sessionId: 'session-a' });

        expect(values.onStatus).toHaveBeenLastCalledWith('degraded');
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
        expect(harness.listeners.size).toBe(0);
    });

    it('degrades when the server reports AI unavailable', async () => {
        const values = await startSession();
        fire('call.unavailable', {
            sessionId: 'session-a',
            reason: 'AI_UNAVAILABLE',
        });

        expect(values.onStatus).toHaveBeenLastCalledWith('degraded');
        expect(values.stopRecognition).toHaveBeenCalledOnce();
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
    });

    it('refreshes an unauthorized handshake once before connecting', async () => {
        const values = createHarnessSession();
        const pending = values.session.start(values.startRecognition);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        fire('connect_error', Object.assign(new Error('Unauthorized'), {
            data: { code: 'UNAUTHORIZED' },
        }));
        await vi.waitFor(() =>
            expect(harness.refreshAccessToken).toHaveBeenCalledOnce(),
        );
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledTimes(2),
        );
        expect(harness.socket.auth).toEqual({
            familyId: 'family-a',
            token: 'token-b',
        });
        fire('connect');
        await vi.waitFor(() =>
            expect(harness.socket.emit).toHaveBeenCalledWith('call.start', {}),
        );
        fire('call.started', { sessionId: 'session-a', nextSequence: 0 });
        await pending;
        await values.session.stop();
    });

    it('stops on a forbidden family handshake without starting recognition', async () => {
        const values = createHarnessSession();
        const pending = values.session.start(values.startRecognition);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        fire(
            'connect_error',
            Object.assign(new Error('Family forbidden'), {
                data: { code: 'FAMILY_FORBIDDEN' },
            }),
        );

        await expect(pending).rejects.toThrow('FAMILY_FORBIDDEN');
        expect(values.startRecognition).not.toHaveBeenCalled();
        expect(values.onStatus).toHaveBeenLastCalledWith('degraded');
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
    });

    it('stops after an unauthorized handshake remains rejected after refresh', async () => {
        const values = createHarnessSession();
        const pending = values.session.start(values.startRecognition);
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledOnce(),
        );
        const unauthorized = () =>
            Object.assign(new Error('Unauthorized'), {
                data: { code: 'UNAUTHORIZED' },
            });
        fire('connect_error', unauthorized());
        await vi.waitFor(() =>
            expect(harness.socket.connect).toHaveBeenCalledTimes(2),
        );
        fire('connect_error', unauthorized());

        await expect(pending).rejects.toThrow('UNAUTHORIZED');
        expect(values.startRecognition).not.toHaveBeenCalled();
        expect(values.onStatus).toHaveBeenLastCalledWith('degraded');
        expect(harness.socket.disconnect).toHaveBeenCalledOnce();
    });
});
