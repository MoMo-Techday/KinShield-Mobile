// Expo Web dùng endpoint cookie như KinShield-Web.
export const usesAuthCookies: boolean = true;

export const authEndpoint = {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    changePassword: '/auth/password/change',
};
