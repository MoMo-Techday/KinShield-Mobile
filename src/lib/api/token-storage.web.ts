const ACCESS_TOKEN_KEY = 'kinshield_access_token';

type StoredAccessToken = {
    token: string;
    expiresAt: number;
};

function isStoredAccessToken(value: unknown): value is StoredAccessToken {
    return (
        typeof value === 'object' &&
        value !== null &&
        'token' in value &&
        typeof value.token === 'string' &&
        'expiresAt' in value &&
        typeof value.expiresAt === 'number'
    );
}

function getBrowserStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
}

// Phiên trình duyệt giữ refresh credential trong cookie HttpOnly do Core quản lý.
export async function saveAccessToken(
    token: string,
    expiresIn: number,
): Promise<void> {
    if (!token.trim() || !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new TypeError(
            'A valid access token and positive expiry are required.',
        );
    }

    const storage = getBrowserStorage();
    if (!storage) {
        throw new Error('Access tokens can only be stored in a browser.');
    }

    const storedToken: StoredAccessToken = {
        token,
        expiresAt: Date.now() + expiresIn * 1_000,
    };
    storage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(storedToken));
}

export async function getAccessToken(): Promise<string | null> {
    const storage = getBrowserStorage();
    if (!storage) {
        return null;
    }

    const storedValue = storage.getItem(ACCESS_TOKEN_KEY);
    if (!storedValue) {
        return null;
    }

    let storedValueParsed: unknown;
    try {
        storedValueParsed = JSON.parse(storedValue) as unknown;
    } catch {
        await clearAccessToken();
        return null;
    }

    if (
        !isStoredAccessToken(storedValueParsed) ||
        !storedValueParsed.token ||
        !Number.isFinite(storedValueParsed.expiresAt) ||
        Date.now() >= storedValueParsed.expiresAt
    ) {
        await clearAccessToken();
        return null;
    }

    return storedValueParsed.token;
}

export async function clearAccessToken(): Promise<void> {
    getBrowserStorage()?.removeItem(ACCESS_TOKEN_KEY);
}

// JavaScript trên Web không đọc được refresh token trong cookie HttpOnly.
export async function getRefreshToken(): Promise<null> {
    return null;
}
