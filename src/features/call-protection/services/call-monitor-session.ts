import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import type {
    CallAnalysisEvent,
    CallStarted,
} from '@/features/call-protection/types/call-protection';
import { redactTranscript } from '@/features/call-protection/utils/call-protection-access';
import { isValidCallAudio } from '@/features/call-protection/utils/call-monitor-state';
import {
    getSessionRevision,
    refreshAccessToken,
    subscribeSessionRevision,
} from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/token-storage';

const MAX_TRANSCRIPT_CHUNK_LENGTH = 2_000;
const MAX_QUEUED_CHUNKS = 8;
const MAX_CHUNKS_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;
const CHUNK_OUTCOME_TIMEOUT_MS = 15_000;

export type CallMonitorStatus =
    | 'connecting'
    | 'server-session'
    | 'listening'
    | 'analyzing'
    | 'degraded'
    | 'stopped';

type StartRecognition = (
    onFinalizedTranscript: (text: string) => void,
    onInterrupted: () => void,
    onInterimTranscript: (text: string) => void,
) => Promise<void>;

type CallMonitorSessionOptions = {
    familyId: string;
    onStatus: (status: CallMonitorStatus) => void;
    onAnalysis: (analysis: CallAnalysisEvent) => void;
    onError?: (code: string) => void;
    stopRecognition: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCallStarted(value: unknown): value is CallStarted {
    return (
        isRecord(value) &&
        typeof value.sessionId === 'string' &&
        value.sessionId.length > 0 &&
        typeof value.nextSequence === 'number' &&
        Number.isSafeInteger(value.nextSequence) &&
        value.nextSequence >= 0
    );
}

function parseCallAnalysis(value: unknown): CallAnalysisEvent | null {
    if (
        !isRecord(value) ||
        typeof value.sessionId !== 'string' ||
        typeof value.riskScore !== 'number' ||
        !Number.isFinite(value.riskScore) ||
        !['SAFE', 'WARN', 'BLOCK', 'LOCKDOWN'].includes(
            value.level as string,
        ) ||
        ![0, 1, 2, 3, 4].includes(value.stage as number) ||
        (value.counterQuestion !== null &&
            typeof value.counterQuestion !== 'string') ||
        (value.voiceWarning !== null &&
            typeof value.voiceWarning !== 'string') ||
        !['not_requested', 'available', 'unavailable'].includes(
            value.audioStatus as string,
        ) ||
        !['not_requested', 'confirmed', 'unconfirmed'].includes(
            value.alertStatus as string,
        )
    ) {
        return null;
    }

    return {
        sessionId: value.sessionId,
        riskScore: value.riskScore,
        level: value.level as CallAnalysisEvent['level'],
        stage: value.stage as CallAnalysisEvent['stage'],
        counterQuestion: value.counterQuestion,
        voiceWarning: value.voiceWarning,
        audio:
            value.audio === null || isValidCallAudio(value.audio)
                ? value.audio
                : null,
        audioStatus: value.audioStatus as CallAnalysisEvent['audioStatus'],
        alertStatus: value.alertStatus as CallAnalysisEvent['alertStatus'],
    };
}

function splitCallTranscript(text: string): string[] {
    const chunks: string[] = [];
    let current = '';
    for (const point of text) {
        if (current.length + point.length > MAX_TRANSCRIPT_CHUNK_LENGTH) {
            chunks.push(current);
            current = '';
        }
        current += point;
    }
    if (current) chunks.push(current);
    return chunks;
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    void promise.catch(() => undefined);
    return { promise, resolve, reject };
}

export function createCallMonitorSession({
    familyId,
    onStatus,
    onAnalysis: notifyAnalysis,
    onError,
    stopRecognition,
}: CallMonitorSessionOptions) {
    let socket: ReturnType<typeof io> | undefined;
    let sessionId: string | undefined;
    let nextSequence = 0;
    let started = false;
    let disposed = false;
    let foreground = AppState.currentState === 'active' || AppState.currentState === null;
    let triedRefresh = false;
    let inFlight = false;
    let outcomeTimer: ReturnType<typeof setTimeout> | undefined;
    let removeAppStateListener: (() => void) | undefined;
    let unsubscribeSession: (() => void) | undefined;
    let currentRevision = 0;
    let queue: string[] = [];
    let submittedAt: number[] = [];
    let startDeferred: ReturnType<typeof createDeferred<CallStarted>> | undefined;
    const connected = createDeferred<void>();
    let connectedSettled = false;

    const isCurrent = () =>
        !disposed &&
        foreground &&
        currentRevision === getSessionRevision();

    function removeListeners() {
        if (!socket) return;
        socket.removeAllListeners();
        socket.auth = {};
    }

    function clearPending() {
        queue = [];
        inFlight = false;
        if (outcomeTimer) clearTimeout(outcomeTimer);
        outcomeTimer = undefined;
    }

    function disposeTransport() {
        if (disposed) return;
        disposed = true;
        clearPending();
        removeAppStateListener?.();
        removeAppStateListener = undefined;
        unsubscribeSession?.();
        unsubscribeSession = undefined;
        removeListeners();
        socket?.disconnect();
    }

    function stop(status: 'degraded' | 'stopped', code?: string) {
        if (disposed) return;
        const activeSocket = socket;
        if (activeSocket?.connected && sessionId) {
            activeSocket.emit('call.stop', { sessionId });
        }
        if (!connectedSettled) {
            connectedSettled = true;
            connected.reject(new Error(code ?? status));
        }
        startDeferred?.reject(new Error(code ?? status));
        let finalStatus = status;
        try {
            stopRecognition();
        } catch {
            finalStatus = 'degraded';
            onError?.('RECOGNIZER_STOP_FAILED');
        } finally {
            if (code) onError?.(code);
            onStatus(finalStatus);
            disposeTransport();
        }
    }

    function fail(code: string) {
        if (!connectedSettled) {
            connectedSettled = true;
            connected.reject(new Error(code));
        }
        startDeferred?.reject(new Error(code));
        stop('degraded', code);
    }

    function callErrorCode(error: unknown): string | undefined {
        if (!isRecord(error) || !isRecord(error.data)) return undefined;
        return typeof error.data.code === 'string'
            ? error.data.code
            : undefined;
    }

    function emitNextChunk() {
        if (
            disposed ||
            !isCurrent() ||
            inFlight ||
            !socket?.connected ||
            !sessionId ||
            queue.length === 0
        ) {
            return;
        }
        const now = Date.now();
        submittedAt = submittedAt.filter(
            (time) => now - time < RATE_WINDOW_MS,
        );
        if (submittedAt.length >= MAX_CHUNKS_PER_MINUTE) {
            fail('RATE_LIMITED');
            return;
        }

        const transcriptChunk = queue.shift();
        if (!transcriptChunk) return;
        inFlight = true;
        submittedAt.push(now);
        socket.emit('call.chunk', {
            sessionId,
            sequence: nextSequence,
            transcriptChunk,
        });
        nextSequence += 1;
        onStatus('analyzing');
        outcomeTimer = setTimeout(
            () => fail('OUTCOME_TIMEOUT'),
            CHUNK_OUTCOME_TIMEOUT_MS,
        );
    }

    function enqueueFinalizedTranscript(text: string) {
        if (!isCurrent() || !sessionId) return;
        const redacted = redactTranscript(text);
        const chunks = splitCallTranscript(redacted);
        if (chunks.length === 0) return;

        const coalesced: string[] = [];
        for (const chunk of chunks) {
            const previous = coalesced.at(-1);
            if (
                previous &&
                previous.length + chunk.length <= MAX_TRANSCRIPT_CHUNK_LENGTH
            ) {
                coalesced[coalesced.length - 1] = previous + chunk;
            } else {
                coalesced.push(chunk);
            }
        }
        const firstQueuedChunk = coalesced[0];
        const mergeWithPending =
            queue.length > 0 &&
            firstQueuedChunk !== undefined &&
            queue[queue.length - 1].length + firstQueuedChunk.length <=
                MAX_TRANSCRIPT_CHUNK_LENGTH;
        const chunksToAdd =
            coalesced.length - (mergeWithPending ? 1 : 0);
        if (
            queue.length + Number(inFlight) + chunksToAdd >
            MAX_QUEUED_CHUNKS
        ) {
            fail('QUEUE_LIMIT');
            return;
        }

        if (mergeWithPending && firstQueuedChunk) {
            queue[queue.length - 1] += firstQueuedChunk;
            coalesced.shift();
        }
        queue.push(...coalesced);
        emitNextChunk();
    }

    function onConnectError(error: unknown) {
        if (!isCurrent()) return;
        const code = callErrorCode(error) ?? 'CONNECTION_ERROR';
        if (code === 'UNAUTHORIZED' && !triedRefresh) {
            triedRefresh = true;
            void refreshAccessToken()
                .then((token) => {
                    if (!isCurrent()) return;
                    if (!token?.accessToken) {
                        fail('UNAUTHORIZED');
                        return;
                    }
                    if (socket) {
                        socket.auth = { familyId, token: token.accessToken };
                        socket.connect();
                    }
                })
                .catch(() => fail('UNAUTHORIZED'));
            return;
        }
        fail(code);
    }

    function handleAnalysis(payload: unknown) {
        const analysis = parseCallAnalysis(payload);
        if (
            !analysis ||
            analysis.sessionId !== sessionId ||
            disposed ||
            !inFlight
        ) {
            return;
        }
        if (outcomeTimer) clearTimeout(outcomeTimer);
        outcomeTimer = undefined;
        inFlight = false;
        notifyAnalysis(analysis);
        onStatus('listening');
        emitNextChunk();
    }

    function onUnavailable(payload: unknown) {
        if (!isRecord(payload) || payload.sessionId !== sessionId) return;
        fail('AI_UNAVAILABLE');
    }

    function onOperationError(payload: unknown) {
        if (
            isRecord(payload) &&
            typeof payload.sessionId === 'string' &&
            sessionId &&
            payload.sessionId !== sessionId
        ) {
            return;
        }
        const code =
            isRecord(payload) && typeof payload.code === 'string'
                ? payload.code
                : 'CALL_ERROR';
        fail(code);
    }

    function onServerStopped(payload: unknown) {
        if (!isRecord(payload) || payload.sessionId !== sessionId) return;
        stop('stopped');
    }

    async function start(startRecognition: StartRecognition): Promise<void> {
        if (started || disposed) throw new Error('Call monitor session already started.');
        started = true;
        currentRevision = getSessionRevision();
        if (!foreground) throw new Error('Call monitoring requires foreground state.');
        const origin = process.env.EXPO_PUBLIC_WS_URL?.replace(/\/+$/, '');
        if (!origin) throw new Error('EXPO_PUBLIC_WS_URL is required.');

        onStatus('connecting');
        socket = io(`${origin}/call-monitor`, {
            autoConnect: false,
            forceNew: true,
            reconnection: false,
            timeout: 10_000,
            transports: ['polling', 'websocket'],
            tryAllTransports: true,
        });
        startDeferred = createDeferred<CallStarted>();
        socket.on('connect', () => {
            if (!isCurrent()) return;
            if (!connectedSettled) {
                connectedSettled = true;
                connected.resolve();
            }
        });
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', (reason: unknown) => {
            if (!disposed && reason !== 'io client disconnect') {
                fail('DISCONNECTED');
            }
        });
        socket.on('call.started', (payload: unknown) => {
            if (!isCallStarted(payload)) {
                startDeferred?.reject(new Error('INVALID_CALL_STARTED'));
                return;
            }
            startDeferred?.resolve(payload);
        });
        socket.on('call.analysis', handleAnalysis);
        socket.on('call.unavailable', onUnavailable);
        socket.on('call.error', onOperationError);
        socket.on('call.stopped', onServerStopped);

        removeAppStateListener = AppState.addEventListener(
            'change',
            (state) => {
                foreground = state === 'active';
                if (!foreground) stop('stopped');
            },
        ).remove;
        unsubscribeSession = subscribeSessionRevision(() => stop('stopped'));

        try {
            const existing = await getAccessToken();
            if (!isCurrent()) throw new Error('SESSION_CHANGED');
            const token =
                existing ?? (await refreshAccessToken())?.accessToken;
            if (!isCurrent() || !token) throw new Error('UNAUTHORIZED');
            socket.auth = { familyId, token };
            socket.connect();
            await connected.promise;
            if (!isCurrent()) throw new Error('SESSION_CHANGED');

            onStatus('server-session');
            socket.emit('call.start', {});
            const startedSession = await startDeferred.promise;
            if (!isCurrent()) throw new Error('SESSION_CHANGED');
            sessionId = startedSession.sessionId;
            nextSequence = startedSession.nextSequence;

            await startRecognition(
                enqueueFinalizedTranscript,
                () => stop('degraded', 'INTERRUPTED'),
                () => {
                    if (isCurrent()) onStatus('listening');
                },
            );
            if (!isCurrent()) return;
            onStatus('listening');
        } catch (error) {
            if (!disposed) {
                stop('degraded');
            }
            throw error;
        }
    }

    return {
        start,
        stop: async () => stop('stopped'),
    };
}
