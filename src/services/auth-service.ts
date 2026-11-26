import { authEndpoint } from '@/lib/api/auth-transport';
import {
    apiClient,
    endAuthSession,
    refreshAccessToken,
} from '@/lib/api/client';

export type AuthUser = {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    createdAt: string;
};

export type AuthSession = AccessToken & {
    user: AuthUser;
};

export type AccessToken = {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshToken?: string;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type RegisterRequest = LoginRequest & {
    displayName: string;
};

export type VerifyEmailRequest = {
    email: string;
    code: string;
};

export type ForgotPasswordRequest = {
    email: string;
};

export type ResetPasswordRequest = {
    token: string;
    password: string;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
};

export const authService = {
    // Mở phiên bằng hợp đồng phù hợp với nền tảng đang chạy.
    async login(payload: LoginRequest): Promise<AuthSession> {
        const response = await apiClient.post<AuthSession>(
            authEndpoint.login,
            payload,
        );
        return response.data;
    },

    // Hoàn tất đăng ký và nhận ngay phiên của tài khoản mới.
    async register(payload: RegisterRequest): Promise<AuthSession> {
        const response = await apiClient.post<AuthSession>(
            authEndpoint.register,
            payload,
        );
        return response.data;
    },

    async verifyEmail(
        payload: VerifyEmailRequest,
    ): Promise<{ emailVerified: true }> {
        const response = await apiClient.post<{ emailVerified: true }>(
            '/auth/email/verify',
            payload,
        );
        return response.data;
    },

    async forgotPassword(
        payload: ForgotPasswordRequest,
    ): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>(
            '/auth/password/forgot',
            payload,
        );
        return response.data;
    },

    async resetPassword(payload: ResetPasswordRequest): Promise<void> {
        await apiClient.post<void>('/auth/password/reset', payload);
    },

    // Core thu hồi phiên cũ và trả phiên thay thế sau khi đổi mật khẩu.
    async changePassword(payload: ChangePasswordRequest): Promise<AuthSession> {
        const response = await apiClient.post<AuthSession>(
            authEndpoint.changePassword,
            payload,
        );
        return response.data;
    },

    refreshSession: refreshAccessToken,

    async getCurrentUser(): Promise<AuthUser> {
        const response = await apiClient.get<AuthUser>('/auth/me');
        return response.data;
    },

    logout: endAuthSession,
};
