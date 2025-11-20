import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3090/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const getSessionToken = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return sessionStorage.getItem('token');
    } catch {
        return null;
    }
};

api.interceptors.request.use((config) => {
    const token = getSessionToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if we're not already on the login/register page
            // This prevents redirect loops during login flow
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        // Handle email verification required - don't redirect, let frontend handle with modals
        // The modal will show on dashboard/assessment pages for unverified users
        // if (error.response?.status === 403 && error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        //     const currentPath = window.location.pathname;
        //     if (!currentPath.includes('/verify-email')) {
        //         window.location.href = '/verify-email';
        //     }
        // }
        return Promise.reject(error);
    }
);

export default api;

