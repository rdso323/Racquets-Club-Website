import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { rememberLoginReturnPath } from '../lib/loginReturn';

/** Navigate to /login and remember the current page so sign-in returns here. */
export const useGoToLogin = () => {
    const navigate = useNavigate();
    const { pathname, search, hash } = useLocation();

    return useCallback(() => {
        rememberLoginReturnPath(`${pathname}${search}${hash}`);
        navigate('/login');
    }, [navigate, pathname, search, hash]);
};
