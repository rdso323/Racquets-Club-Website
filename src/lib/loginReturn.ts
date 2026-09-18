const LOGIN_RETURN_KEY = 'login_return_to';

const isSafeReturnPath = (path: string): boolean =>
    path.startsWith('/') && !path.startsWith('//') && path !== '/login' && !path.startsWith('/login?');

/**
 * Remember where a visitor was before heading to /login so we can bring them
 * back after sign-in. Uses localStorage (not sessionStorage) because email
 * sign-in links usually open in a fresh tab on the same device.
 */
export const rememberLoginReturnPath = (path: string): void => {
    if (!isSafeReturnPath(path)) return;
    try {
        window.localStorage.setItem(LOGIN_RETURN_KEY, path);
    } catch {
        /* storage unavailable — fall back to home after login */
    }
};

/** Read and clear the remembered path; defaults to home. */
export const consumeLoginReturnPath = (): string => {
    try {
        const stored = window.localStorage.getItem(LOGIN_RETURN_KEY);
        window.localStorage.removeItem(LOGIN_RETURN_KEY);
        return stored && isSafeReturnPath(stored) ? stored : '/';
    } catch {
        return '/';
    }
};
