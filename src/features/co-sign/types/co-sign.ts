// Kiểu dữ liệu gửi và nhận từ các endpoint Co-Sign cho giao dịch mô phỏng.
export type CoSignStatus =
    | 'NOT_REQUIRED'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'BLOCKED'
    | 'CANCELLED'
    | 'EXPIRED';
export type CoSignAction = 'APPROVE' | 'BLOCK' | 'CANCEL';
export type CoSignReason = 'AMOUNT_THRESHOLD' | 'HIGH_RISK';

export type CoSignSnapshot = {
    id: string;
    familyId: string;
    amountVnd: number;
    status: CoSignStatus;
    reasonCodes: CoSignReason[];
    createdAt: string;
    expiresAt: string | null;
    decidedAt: string | null;
    version: number;
};

export type CoSignDetail = CoSignSnapshot & { serverNow: string };
export type CoSignPage = {
    items: CoSignSnapshot[];
    nextCursor: string | null;
    serverNow: string;
};
export type CoSignEvent = {
    requestId: string;
    status: CoSignStatus;
    version: number;
};
export type TimedCoSign<T> = { snapshot: T; requestedAt: number };

export type SimulationAttempt = {
    key: string;
    transfer: {
        transactionId: string;
        amountVnd: number;
        recipientRef: string;
        recipientLabel: string;
        recipientKnown: boolean;
    };
};
