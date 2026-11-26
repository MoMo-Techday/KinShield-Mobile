import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/lib/api/api-error';
import { storeAuthSession } from '@/lib/api/client';
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
            queryClient.removeQueries({ queryKey: ['auth', 'me'] });
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
    });
}

export function useCurrentUser() {
    const query = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: authService.getCurrentUser,
        retry: shouldRetryProfileQuery,
    });
    useEffect(() => {
        if (query.error && !isUnauthorizedProfileError(query.error)) {
            toast.error(getApiErrorMessage(query.error));
        }
    }, [query.error]);

    return query;
}
