import { apiClient } from '@/lib/api/client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
};

export type AccessToken = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
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
  async login(payload: LoginRequest): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>('/auth/login', payload);
    return response.data;
  },

  async register(payload: RegisterRequest): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>('/auth/register', payload);
    return response.data;
  },

  async verifyEmail(payload: VerifyEmailRequest): Promise<{ emailVerified: true }> {
    const response = await apiClient.post<{ emailVerified: true }>(
      '/auth/email/verify',
      payload,
    );
    return response.data;
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/password/forgot',
      payload,
    );
    return response.data;
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await apiClient.post<void>('/auth/password/reset', payload);
  },

  async changePassword(payload: ChangePasswordRequest): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>(
      '/auth/password/change',
      payload,
    );
    return response.data;
  },

  async refreshSession(): Promise<AccessToken> {
    const response = await apiClient.post<AccessToken>('/auth/refresh');
    return response.data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },
};
