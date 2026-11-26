// Phối hợp Bearer, refresh dùng một lần và thu hồi phiên cho mọi request xác thực.
import {
    CanceledError,
    create,
    isAxiosError,
    type AxiosError,
    type InternalAxiosRequestConfig,
} from 'axios';
import type { AccessToken } from '@/services/auth-service';
import { authEndpoint, usesAuthCookies } from '@/lib/api/auth-transport';
import {
    clearAccessToken,
    getAccessToken,
    getRefreshToken,
    saveAccessToken,
} from '@/lib/api/token-storage';

type AuthRequestConfig = InternalAxiosRequestConfig & {
    authRevision?: number;
    authRetried?: boolean;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const defaults = {
    baseURL: apiUrl,
    withCredentials: usesAuthCookies,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
};
const apiClient = create(defaults);
const sessionClient = create(defaults);

let sessionRevision = 0;
let refreshInFlight: Promise<AccessToken | null> | null = null;
let logoutInFlight: Promise<void> | null = null;

// Chỉ đính credential vào các endpoint sở hữu bởi luồng auth hiện có.
function requiresAuthentication(config: InternalAxiosRequestConfig): boolean {
    const method = config.method?.toLowerCase();
    const path = config.url?.split('?')[0].replace(/^\/+/, '');

    return (
        (method === 'get' && path === 'auth/me') ||
        (method === 'post' && path === authEndpoint.changePassword.slice(1))
    );
}

// Các request cùng hết hạn chia sẻ một lần refresh để tránh dùng lại token cũ.
// Nếu logout đang chờ, vẫn lưu cặp token đã xoay để giữ phiên khi logout lỗi mạng.
// Chỉ phiên cùng revision được ghi token. Logout thành công sẽ chờ lần ghi này rồi xóa phiên.
export function refreshAccessToken(): Promise<AccessToken | null> {
    if (refreshInFlight) return refreshInFlight;
    if (logoutInFlight) return Promise.resolve(null);

    const revision = sessionRevision;
    refreshInFlight = (async () => {
        const refreshToken = await getRefreshToken();
        if (!usesAuthCookies && !refreshToken) return null;

        try {
            const { data } = await sessionClient.post<AccessToken>(
                authEndpoint.refresh,
                refreshToken ? { refreshToken } : undefined,
            );
            // Bỏ kết quả khi login thay phiên hoặc logout đã được Core xác nhận.
            if (revision !== sessionRevision) return null;
            await saveAccessToken(
                data.accessToken,
                data.expiresIn,
                data.refreshToken,
            );
            return data;
        } catch (error) {
            const status = isAxiosError(error)
                ? error.response?.status
                : undefined;
            // Chỉ xóa phiên khi server xác nhận credential không dùng được. Lỗi mạng có thể thử lại.
            if (
                revision === sessionRevision &&
                !logoutInFlight &&
                (status === 401 || (usesAuthCookies && status === 400))
            ) {
                await clearAccessToken();
            }
            throw error;
        }
    })().finally(() => {
        refreshInFlight = null;
    });

    return refreshInFlight;
}

// Chờ lần ghi phiên cũ kết thúc trước khi lưu credential của tài khoản mới.
export async function storeAuthSession(session: AccessToken): Promise<void> {
    const revision = ++sessionRevision;
    await refreshInFlight?.catch(() => undefined);
    if (revision !== sessionRevision || logoutInFlight)
        throw new CanceledError();
    await saveAccessToken(
        session.accessToken,
        session.expiresIn,
        session.refreshToken,
    );
}

// Chỉ báo thành công khi Core thu hồi family và thiết bị xóa cặp token.
export function endAuthSession(): Promise<void> {
    if (logoutInFlight) return logoutInFlight;

    logoutInFlight = (async () => {
        const refreshToken = await getRefreshToken();
        // Core vẫn thu hồi family nếu credential đã được xoay bởi request đang chạy.
        if (usesAuthCookies || refreshToken) {
            await sessionClient.post(
                authEndpoint.logout,
                refreshToken ? { refreshToken } : undefined,
            );
        }
        sessionRevision += 1;
        await refreshInFlight?.catch(() => undefined);
        await clearAccessToken();
    })().finally(() => {
        logoutInFlight = null;
    });

    return logoutInFlight;
}

// Chặn cấu hình URL thiếu trước khi gửi dữ liệu, kể cả khi gọi refresh/logout trực tiếp.
function checkApiConfiguration(
    config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
    if (!apiUrl?.trim()) {
        throw new Error(
            'EXPO_PUBLIC_API_URL is required to make API requests.',
        );
    }
    return config;
}

sessionClient.interceptors.request.use(checkApiConfiguration);

apiClient.interceptors.request.use(async (config: AuthRequestConfig) => {
    checkApiConfiguration(config);
    if (!requiresAuthentication(config)) return config;

    config.authRevision ??= sessionRevision;
    const token = await getAccessToken();
    // Một request cũ không được chạy bằng token tài khoản vừa đăng nhập.
    if (config.authRevision !== sessionRevision || logoutInFlight)
        throw new CanceledError();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    else config.headers.delete('Authorization');
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    // Sau 401, lấy token mới và retry một lần trong đúng phiên đã gửi request.
    // Nếu logout bắt đầu trong lúc refresh, chờ kết quả trước khi gửi lại.
    async (error: AxiosError) => {
        const config: AuthRequestConfig | undefined = error.config;
        // Chỉ thử lại một lần với request đúng phiên và đúng nhóm endpoint.
        if (
            error.response?.status !== 401 ||
            !config ||
            config.authRetried ||
            config.authRevision !== sessionRevision ||
            !requiresAuthentication(config)
        ) {
            throw error;
        }

        config.authRetried = true;
        const latestToken = await getAccessToken();
        if (config.authRevision !== sessionRevision) throw error;

        // Một 401 đến muộn dùng token vừa xoay nếu bản gửi đi đã cũ.
        const tokenWasRotated =
            latestToken &&
            config.headers.get('Authorization') !== `Bearer ${latestToken}`;
        if (!tokenWasRotated && !(await refreshAccessToken())) throw error;

        // Refresh đã hoàn tất nên có thể chờ logout. Nếu logout lỗi mạng, cặp token mới vẫn dùng được.
        const pendingLogout = logoutInFlight;
        if (pendingLogout) await pendingLogout.catch(() => undefined);
        if (config.authRevision !== sessionRevision) throw error;
        return apiClient(config);
    },
);

export { apiClient };
