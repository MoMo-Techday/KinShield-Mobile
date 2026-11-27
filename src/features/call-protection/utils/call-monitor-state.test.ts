import { describe, expect, it } from 'vitest';
import type { CallAnalysisEvent } from '@/features/call-protection/types/call-protection';
import {
    createInitialCallMonitorState,
    isValidCallAudio,
    mapCallIntervention,
    reduceCallMonitorState,
} from '@/features/call-protection/utils/call-monitor-state';

function analysis(
    riskScore: number,
    overrides: Partial<CallAnalysisEvent> = {},
): CallAnalysisEvent {
    return {
        sessionId: 'opaque-session',
        riskScore,
        level: riskScore >= 90 ? 'LOCKDOWN' : riskScore >= 75 ? 'BLOCK' : riskScore >= 55 ? 'WARN' : 'SAFE',
        stage: 0,
        counterQuestion: 'Bạn có tự yêu cầu mã này không?',
        voiceWarning: 'Dừng lại và xác minh.',
        audio: null,
        audioStatus: 'unavailable',
        alertStatus: 'not_requested',
        ...overrides,
    };
}

function listeningState() {
    let state = createInitialCallMonitorState();
    state = reduceCallMonitorState(state, { type: 'consent-accepted' });
    state = reduceCallMonitorState(state, { type: 'permission-granted' });
    state = reduceCallMonitorState(state, { type: 'start-requested' });
    state = reduceCallMonitorState(state, { type: 'connection-established' });
    return reduceCallMonitorState(state, { type: 'session-started' });
}

describe('call intervention mapping', () => {
    it('accepts only non-empty binary audio payloads', () => {
        expect(isValidCallAudio(new Uint8Array([1]))).toBe(true);
        expect(isValidCallAudio(new ArrayBuffer(1))).toBe(true);
        expect(isValidCallAudio(new Uint8Array())).toBe(false);
        expect(isValidCallAudio(new ArrayBuffer(0))).toBe(false);
        expect(isValidCallAudio('audio')).toBe(false);
        expect(isValidCallAudio(null)).toBe(false);
    });

    it('does not interrupt for scores below 55', () => {
        expect(mapCallIntervention(analysis(54))).toEqual({
            kind: 'non-interruptive',
        });
    });

    it('asks a counter-question for scores from 55 through 74', () => {
        expect(mapCallIntervention(analysis(55))).toEqual({
            kind: 'counter-question',
            question: 'Bạn có tự yêu cầu mã này không?',
        });
        expect(mapCallIntervention(analysis(74)).kind).toBe('counter-question');
    });

    it('shows a warning from 75 through 89 and allows replay only for valid available audio', () => {
        expect(mapCallIntervention(analysis(75))).toEqual({
            kind: 'warning',
            warning: 'Dừng lại và xác minh.',
            canReplayAudio: false,
        });
        expect(
            mapCallIntervention(
                analysis(89, {
                    audio: new Uint8Array([1, 2, 3]),
                    audioStatus: 'available',
                }),
            ),
        ).toEqual({
            kind: 'warning',
            warning: 'Dừng lại và xác minh.',
            canReplayAudio: true,
        });
        expect(
            mapCallIntervention(
                analysis(80, {
                    audio: new Uint8Array(),
                    audioStatus: 'available',
                }),
            ).kind,
        ).toBe('warning');
        expect(
            mapCallIntervention(
                analysis(80, {
                    audio: new Uint8Array(),
                    audioStatus: 'available',
                }),
            ),
        ).toMatchObject({ canReplayAudio: false });
    });

    it('shows high-risk status and preserves the server SOS result from 90+', () => {
        expect(
            mapCallIntervention(
                analysis(90, {
                    alertStatus: 'unconfirmed',
                }),
            ),
        ).toEqual({ kind: 'high-risk', alertStatus: 'unconfirmed' });
    });

    it('does not infer safety when analysis is missing', () => {
        expect(mapCallIntervention(null)).toEqual({ kind: 'analyzing' });
    });
});

describe('call monitor state transitions', () => {
    it('starts idle and ignores a detected call until the user explicitly starts', () => {
        const idle = createInitialCallMonitorState();
        const callDetected = reduceCallMonitorState(idle, {
            type: 'call-detected',
        });
        expect(callDetected.phase).toBe('idle');

        const consented = reduceCallMonitorState(callDetected, {
            type: 'consent-accepted',
        });
        const permitted = reduceCallMonitorState(consented, {
            type: 'permission-granted',
        });
        expect(
            reduceCallMonitorState(permitted, { type: 'start-requested' })
                .phase,
        ).toBe('connecting');
    });

    it('degrades with no safe analysis when an expected analysis is missing', () => {
        let state = reduceCallMonitorState(listeningState(), {
            type: 'transcript-finalized',
        });
        expect(state.phase).toBe('analyzing');
        state = reduceCallMonitorState(state, { type: 'analysis-missing' });
        expect(state.phase).toBe('degraded');
        expect(state.analysis).toBeNull();
        expect(mapCallIntervention(state.analysis)).toEqual({
            kind: 'analyzing',
        });
    });

    it('clears the previous analysis when new transcript arrives', () => {
        let state = reduceCallMonitorState(listeningState(), {
            type: 'transcript-finalized',
        });
        state = reduceCallMonitorState(state, {
            type: 'analysis-received',
            analysis: analysis(20),
        });
        expect(state.analysis?.riskScore).toBe(20);

        state = reduceCallMonitorState(state, {
            type: 'interim-transcript',
            text: 'Nội dung mới',
        });
        expect(state.analysis).toBeNull();
        expect(mapCallIntervention(state.analysis)).toEqual({
            kind: 'analyzing',
        });
    });

    it.each([
        'permission-lost',
        'interrupted',
        'backgrounded',
        'authorization-lost',
        'stop-requested',
    ] as const)(
        'clears transcript and leaves capture on %s',
        (type) => {
            let state = reduceCallMonitorState(listeningState(), {
                type: 'interim-transcript',
                text: 'Mã xác thực 123456',
            });
            expect(state.transcriptPreview).not.toBe('');
            state = reduceCallMonitorState(state, { type });
            expect(state.phase).not.toBe('listening');
            expect(state.phase).not.toBe('analyzing');
            expect(state.transcriptPreview).toBe('');
        },
    );

    it('clears server state when cleanup finishes', () => {
        const stopping = reduceCallMonitorState(listeningState(), {
            type: 'stop-requested',
        });
        const stopped = reduceCallMonitorState(stopping, {
            type: 'cleanup-completed',
        });
        expect(stopped.phase).toBe('stopped');
        expect(stopped.analysis).toBeNull();
        expect(stopped.transcriptPreview).toBe('');
    });

    it('clears preview and analysis on general service degradation', () => {
        let state = reduceCallMonitorState(listeningState(), {
            type: 'interim-transcript',
            text: 'Nội dung tạm thời',
        });
        state = reduceCallMonitorState(state, {
            type: 'analysis-received',
            analysis: analysis(20),
        });
        state = reduceCallMonitorState(state, { type: 'monitor-degraded' });

        expect(state.phase).toBe('degraded');
        expect(state.transcriptPreview).toBe('');
        expect(state.analysis).toBeNull();
    });
});
