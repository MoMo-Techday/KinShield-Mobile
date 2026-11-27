export function canMonitorCall(role: unknown): role is 'PARENT' {
    return role === 'PARENT';
}

export function canViewCallAlerts(role: unknown): role is 'GUARDIAN' {
    return role === 'GUARDIAN';
}

const REDACTED = '[REDACTED]';

// Best-effort masking of recognizable high-risk values, not complete PII detection.
export function redactTranscript(text: string): string {
    return text
        .replace(
            /\b(OTP|PIN)(\s*[:#-]?\s*)(\d{4,8})\b/gi,
            `$1$2${REDACTED}`,
        )
        .replace(
            /\b(STK)(\s*[:#-]?\s*)(\d{8,20})\b/gi,
            `$1$2${REDACTED}`,
        )
        .replace(
            /\b(CCCD)(\s*[:#-]?\s*)(\d{12})\b/gi,
            `$1$2${REDACTED}`,
        )
        .replace(
            /(^|[^\d])(\+84(?:[\s.-]?\d){9}|0(?:[\s.-]?\d){9})(?!\d)/g,
            `$1${REDACTED}`,
        )
        .replace(
            /(^|[^\d])((?:\d[ -]?){15}\d)(?!\d)/g,
            `$1${REDACTED}`,
        );
}
