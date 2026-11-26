// Điều phối vòng đời phiên Mobile và cache dữ liệu gắn với tài khoản hiện tại.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/lib/api/api-error';
import { usesAuthCookies } from '@/lib/api/auth-transport';
import { storeAuthSession } from '@/lib/api/client';
import { clearSessionQueries } from '@/lib/api/session-query';
import { getRefreshToken } from '@/lib/api/token-storage';
import {
    isUnauthorizedProfileError,
    shouldRetryProfileQuery,
} from '@/lib/profile-state';
import {
    authService,
    type AuthSession,
    type ChangePasswordRequest,
    type ForgotPasswordRequest,
    type LoginRequest,
    type RegisterRequest,
    type ResetPasswordRequest,
} from '@/services/auth-service';

// Chỉ cập nhật hồ sơ sau khi cặp token mới đã được lưu thành công.
function useSessionMutation<TVariables>(
    mutationFn: (variables: TVariables) => Promise<AuthSession>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: async (session) => {
            await storeAuthSession(session);
            await queryClient.cancelQueries({ queryKey: ['auth', 'me'] });
            await clearSessionQueries(queryClient);
            queryClient.setQueryData(['auth', 'me'], session.user);
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
    });
}

function useAuthMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
) {
    return useMutation({
        mutationFn,
        onError: (error) => toast.error(getApiErrorMessage(error)),
    });
}

export function useLogin() {
    return useSessionMutation<LoginRequest>(authService.login);
}

export function useRegister() {
    return useSessionMutation<RegisterRequest>(authService.register);
}

export function useVerifyEmail() {
    return useAuthMutation(authService.verifyEmail);
}

export function useForgotPassword() {
    return useAuthMutation<{ message: string }, ForgotPasswordRequest>(
        authService.forgotPassword,
    );
}

export function useResetPassword() {
    return useAuthMutation<void, ResetPasswordRequest>(
        authService.resetPassword,
    );
}

export function useChangePassword() {
    return useSessionMutation<ChangePasswordRequest>(
        authService.changePassword,
    );
}

// Sau khi thu hồi phiên, bỏ dữ liệu hồ sơ trước khi quay lại màn đăng nhập.
export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: authService.logout,
        onSuccess: async () => {
            await queryClient.cancelQueries({ queryKey: ['auth', 'me'] });
            await clearSessionQueries(queryClient);
            queryClient.removeQueries({ queryKey: ['auth', 'me'] });
            queryClient.removeQueries({ queryKey: ['auth', 'restore'] });
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
    });
}

// Kiểm tra kho local khi mở ứng dụng. Hồ sơ sẽ xác minh phiên qua Core.
export function useRestoreSession() {
    return useQuery({
        queryKey: ['auth', 'restore'],
        queryFn: async () => Boolean(await getRefreshToken()),
        enabled: !usesAuthCookies,
        gcTime: 0,
        retry: false,
    });
}

// Android/iOS gọi lại /me khi trở về foreground để xoay token nếu cần.
export function useCurrentUser() {
    const query = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: authService.getCurrentUser,
        retry: shouldRetryProfileQuery,
    });
    const { refetch } = query;

    useEffect(() => {
        if (usesAuthCookies) return;

        const listener = AppState.addEventListener('change', (state) => {
            if (state === 'active') void refetch();
        });
        return () => listener.remove();
    }, [refetch]);

    useEffect(() => {
        if (query.error && !isUnauthorizedProfileError(query.error)) {
            toast.error(getApiErrorMessage(query.error));
        }
    }, [query.error]);

    return query;
}
