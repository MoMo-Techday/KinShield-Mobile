import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './auth-service';

// Đại diện hợp đồng HTTP và kiểm tra chuyển đúng vòng đời đến nơi sở hữu token.
const { apiClient, endAuthSession, refreshAccessToken } = vi.hoisted(() => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
    endAuthSession: vi.fn(),
    refreshAccessToken: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
    apiClient,
    endAuthSession,
    refreshAccessToken,
}));

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sends login credentials to the login endpoint', async () => {
        apiClient.post.mockResolvedValue({ data: {} });

        await authService.login({
            email: 'user@example.com',
            password: 'password',
        });

        expect(apiClient.post).toHaveBeenCalledWith('/auth/native/login', {
            email: 'user@example.com',
            password: 'password',
        });
    });

    it('sends registration fields to the register endpoint', async () => {
        apiClient.post.mockResolvedValue({ data: {} });

        await authService.register({
            email: 'user@example.com',
            displayName: 'User',
            password: 'long-enough-password',
        });

        expect(apiClient.post).toHaveBeenCalledWith('/auth/native/register', {
            email: 'user@example.com',
            displayName: 'User',
            password: 'long-enough-password',
        });
    });

    it('sends both email and code to the verification endpoint', async () => {
        apiClient.post.mockResolvedValue({ data: { emailVerified: true } });

        await authService.verifyEmail({
            email: 'user@example.com',
            code: '042781',
        });

        expect(apiClient.post).toHaveBeenCalledWith('/auth/email/verify', {
            email: 'user@example.com',
            code: '042781',
        });
    });

    it('sends the email to the forgot-password endpoint', async () => {
        apiClient.post.mockResolvedValue({ data: { message: 'Accepted' } });

        await authService.forgotPassword({ email: 'user@example.com' });

        expect(apiClient.post).toHaveBeenCalledWith('/auth/password/forgot', {
            email: 'user@example.com',
        });
    });

    it('sends token and password to reset and resolves the 204 response as undefined', async () => {
        apiClient.post.mockResolvedValue({ data: undefined });

        await expect(
            authService.resetPassword({
                token: 'r'.repeat(43),
                password: 'long-enough-password',
            }),
        ).resolves.toBeUndefined();
        expect(apiClient.post).toHaveBeenCalledWith('/auth/password/reset', {
            token: 'r'.repeat(43),
            password: 'long-enough-password',
        });
    });

    it('sends both password values to the change-password endpoint', async () => {
        apiClient.post.mockResolvedValue({ data: {} });

        await authService.changePassword({
            currentPassword: 'current-password',
            newPassword: 'long-enough-password',
        });

        expect(apiClient.post).toHaveBeenCalledWith(
            '/auth/native/password/change',
            {
                currentPassword: 'current-password',
                newPassword: 'long-enough-password',
            },
        );
    });

    // Dùng cùng lần refresh đang chạy với interceptor để token không bị dùng lại.
    it('delegates refresh to the shared session lifecycle', async () => {
        await authService.refreshSession();

        expect(refreshAccessToken).toHaveBeenCalledOnce();
    });

    it('requests the current user from the protected endpoint', async () => {
        apiClient.get.mockResolvedValue({ data: {} });

        await authService.getCurrentUser();

        expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    // Logout phải thu hồi đúng family trước khi xóa session thiết bị.
    it('delegates logout to the shared session lifecycle', async () => {
        await authService.logout();

        expect(endAuthSession).toHaveBeenCalledOnce();
    });
});
