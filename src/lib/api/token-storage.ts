// Chứa cặp credential xoay cùng nhau trong kho bảo mật Android/iOS.
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'kinshield_access_token';

type StoredSession = {
    accessToken: string;
    expiresAt: number;
    refreshToken: string;
};

// Bỏ qua record hỏng để lần đăng nhập tiếp theo ghi đè cặp token mới an toàn.
async function readSession(): Promise<StoredSession | null> {
    const storedValue = await SecureStore.getItemAsync(SESSION_KEY);
    if (!storedValue) return null;

    try {
        const session: Partial<StoredSession> | null = JSON.parse(storedValue);
        if (
            typeof session?.accessToken === 'string' &&
            session.accessToken.length > 0 &&
            typeof session.refreshToken === 'string' &&
            session.refreshToken.length > 0 &&
            typeof session.expiresAt === 'number' &&
            Number.isFinite(session.expiresAt)
        ) {
            return {
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresAt: session.expiresAt,
            };
        }
    } catch {
        // JSON lỗi được xem như thiết bị chưa có phiên có thể khôi phục.
    }
    return null;
}

// Ghi một record để app luôn đọc được cặp token từ cùng một lần phát hoặc refresh.
export async function saveAccessToken(
    accessToken: string,
    expiresIn: number,
    refreshToken?: string,
): Promise<void> {
    if (
        !accessToken.trim() ||
        !refreshToken?.trim() ||
        !Number.isFinite(expiresIn) ||
        expiresIn <= 0
    ) {
        throw new TypeError(
            'A valid access token, refresh token and expiry are required.',
        );
    }

    const session: StoredSession = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1_000,
    };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

// Access hết hạn sẽ kích hoạt refresh nhưng vẫn giữ lại refresh token.
export async function getAccessToken(): Promise<string | null> {
    const session = await readSession();
    return session && Date.now() < session.expiresAt
        ? session.accessToken
        : null;
}

// Cho phép thử khôi phục phiên đã hết access token sau khi mở lại ứng dụng.
export async function getRefreshToken(): Promise<string | null> {
    return (await readSession())?.refreshToken ?? null;
}

// Xóa cả hai credential khi Core thu hồi phiên hoặc từ chối refresh.
export async function clearAccessToken(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
}
