export type CallStarted = {
    sessionId: string;
    nextSequence: number;
};

export type CallChunkRequest = {
    sessionId: string;
    sequence: number;
    transcriptChunk: string;
};

export type CallAnalysisLevel = 'SAFE' | 'WARN' | 'BLOCK' | 'LOCKDOWN';
export type CallAlertStatus = 'not_requested' | 'confirmed' | 'unconfirmed';
export type CallAudioStatus = 'not_requested' | 'available' | 'unavailable';

export type CallAnalysisEvent = {
    sessionId: string;
    riskScore: number;
    level: CallAnalysisLevel;
    stage: 0 | 1 | 2 | 3 | 4;
    counterQuestion: string | null;
    voiceWarning: string | null;
    audio: Uint8Array | ArrayBuffer | null;
    audioStatus: CallAudioStatus;
    alertStatus: CallAlertStatus;
};

export type CallAlert = {
    alertId: string;
    riskScore: number;
    stage: number;
    createdAt: string;
};

export type CallAlertPage = {
    items: CallAlert[];
    nextCursor: string | null;
};
