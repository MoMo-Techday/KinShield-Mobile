// Android/iOS gửi refresh token tường minh và tắt cookie trong HTTP client.
export const usesAuthCookies: boolean = false;

export const authEndpoint = {
    login: '/auth/native/login',
    register: '/auth/native/register',
    refresh: '/auth/native/refresh',
    logout: '/auth/native/logout',
    changePassword: '/auth/native/password/change',
};
