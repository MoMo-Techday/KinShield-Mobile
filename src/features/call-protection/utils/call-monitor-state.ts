import type {
    CallAlertStatus,
    CallAnalysisEvent,
} from '@/features/call-protection/types/call-protection';

export type CallMonitorPhase =
    | 'idle'
    | 'consent'
    | 'permission'
    | 'connecting'
    | 'server-session'
    | 'listening'
    | 'analyzing'
    | 'degraded'
    | 'stopping'
    | 'stopped';

export type CallMonitorState = {
    phase: CallMonitorPhase;
    consentAccepted: boolean;
    permissionGranted: boolean;
    transcriptPreview: string;
    analysis: CallAnalysisEvent | null;
};

export type CallMonitorEvent =
    | { type: 'consent-presented' }
    | { type: 'consent-accepted' }
    | { type: 'permission-requested' }
    | { type: 'permission-granted' }
    | { type: 'permission-denied' }
    | { type: 'start-requested' }
    | { type: 'connection-established' }
    | { type: 'session-started' }
    | { type: 'call-detected' }
    | { type: 'interim-transcript'; text: string }
    | { type: 'transcript-finalized' }
    | { type: 'analysis-received'; analysis: CallAnalysisEvent }
    | { type: 'analysis-missing' }
    | { type: 'monitor-degraded' }
    | { type: 'permission-lost' }
    | { type: 'interrupted' }
    | { type: 'stop-requested' }
    | { type: 'cleanup-completed' }
    | { type: 'backgrounded' }
    | { type: 'authorization-lost' };

export type CallIntervention =
    | { kind: 'analyzing' }
    | { kind: 'non-interruptive' }
    | { kind: 'counter-question'; question: string | null }
    | {
          kind: 'warning';
          warning: string | null;
          canReplayAudio: boolean;
      }
    | { kind: 'high-risk'; alertStatus: CallAlertStatus };

export function createInitialCallMonitorState(): CallMonitorState {
    return {
        phase: 'idle',
        consentAccepted: false,
        permissionGranted: false,
        transcriptPreview: '',
        analysis: null,
    };
}

function clearSensitiveState(
    state: CallMonitorState,
    phase: CallMonitorPhase,
): CallMonitorState {
    return {
        ...state,
        phase,
        transcriptPreview: '',
        analysis: null,
    };
}

export function reduceCallMonitorState(
    state: CallMonitorState,
    event: CallMonitorEvent,
): CallMonitorState {
    switch (event.type) {
        case 'call-detected':
            return state;
        case 'consent-presented':
            return state.phase === 'idle'
                ? { ...state, phase: 'consent' }
                : state;
        case 'consent-accepted':
            return state.phase === 'consent' || state.phase === 'idle'
                ? {
                      ...state,
                      phase: 'permission',
                      consentAccepted: true,
                  }
                : state;
        case 'permission-requested':
            return state.consentAccepted
                ? { ...state, phase: 'permission' }
                : state;
        case 'permission-granted':
            return state.consentAccepted
                ? {
                      ...state,
                      phase: 'idle',
                      permissionGranted: true,
                  }
                : state;
        case 'permission-denied':
            return clearSensitiveState(
                { ...state, permissionGranted: false },
                'degraded',
            );
        case 'start-requested':
            return state.consentAccepted && state.permissionGranted
                ? clearSensitiveState(state, 'connecting')
                : state;
        case 'connection-established':
            return state.phase === 'connecting'
                ? { ...state, phase: 'server-session' }
                : state;
        case 'session-started':
            return state.phase === 'server-session'
                ? { ...state, phase: 'listening' }
                : state;
        case 'interim-transcript':
            return state.phase === 'listening' || state.phase === 'analyzing'
                ? {
                      ...state,
                      phase: 'listening',
                      transcriptPreview: event.text,
                      analysis: null,
                  }
                : state;
        case 'transcript-finalized':
            return state.phase === 'listening'
                ? { ...state, phase: 'analyzing', analysis: null }
                : state;
        case 'analysis-received':
            return state.phase === 'analyzing'
                ? {
                      ...state,
                      phase: 'listening',
                      transcriptPreview: '',
                      analysis: event.analysis,
                  }
                : state;
        case 'analysis-missing':
            return state.phase === 'analyzing'
                ? clearSensitiveState(state, 'degraded')
                : state;
        case 'monitor-degraded':
            return clearSensitiveState(state, 'degraded');
        case 'permission-lost':
            return clearSensitiveState(
                { ...state, permissionGranted: false },
                'degraded',
            );
        case 'interrupted':
            return clearSensitiveState(state, 'degraded');
        case 'stop-requested':
            return clearSensitiveState(state, 'stopping');
        case 'cleanup-completed':
            return clearSensitiveState(state, 'stopped');
        case 'backgrounded':
        case 'authorization-lost':
            return clearSensitiveState(state, 'stopped');
    }
}

export function isValidCallAudio(audio: unknown): audio is Uint8Array | ArrayBuffer {
    if (audio instanceof ArrayBuffer) return audio.byteLength > 0;
    return audio instanceof Uint8Array && audio.byteLength > 0;
}

export function mapCallIntervention(
    analysis: CallAnalysisEvent | null,
): CallIntervention {
    if (!analysis) return { kind: 'analyzing' };
    if (analysis.riskScore < 55) return { kind: 'non-interruptive' };
    if (analysis.riskScore < 75) {
        return {
            kind: 'counter-question',
            question: analysis.counterQuestion,
        };
    }
    if (analysis.riskScore < 90) {
        return {
            kind: 'warning',
            warning: analysis.voiceWarning,
            canReplayAudio:
                analysis.audioStatus === 'available' &&
                isValidCallAudio(analysis.audio),
        };
    }
    return { kind: 'high-risk', alertStatus: analysis.alertStatus };
}
