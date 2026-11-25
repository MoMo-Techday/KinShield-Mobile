import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/lib/api/api-error';
import { saveAccessToken } from '@/lib/api/token-storage';
import {
  authService,
  type AuthSession,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
} from '@/services/auth-service';

function useSessionMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<AuthSession>,
) {
  return useMutation({
    mutationFn,
    onSuccess: async (session) => {
      await saveAccessToken(session.accessToken, session.expiresIn);
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
  return useAuthMutation<void, ResetPasswordRequest>(authService.resetPassword);
}

export function useChangePassword() {
  return useSessionMutation<ChangePasswordRequest>(authService.changePassword);
}

export function useRefreshSession() {
  return useMutation({
    mutationFn: authService.refreshSession,
    onSuccess: async (token) => {
      await saveAccessToken(token.accessToken, token.expiresIn);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
  });

  useEffect(() => {
    if (query.error) {
      toast.error(getApiErrorMessage(query.error));
    }
  }, [query.error]);

  return query;
}
