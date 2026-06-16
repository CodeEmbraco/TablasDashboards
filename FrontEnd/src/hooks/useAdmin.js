import { useState, useCallback } from 'react';

export const useAdmin = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminWarning, setAdminWarning] = useState("");

    const showWarning = useCallback((msg) => {
        setAdminWarning(msg);
        setTimeout(() => setAdminWarning(""), 3000);
    }, []);

    const handleUnlock = useCallback(() => {
        setIsAdmin(true);
    }, []);

    const handleExpire = useCallback(() => {
        setIsAdmin(false);
    }, []);

    const handleLogout = useCallback(() => {
        setIsAdmin(false);
    }, []);

    return { isAdmin, handleUnlock, handleExpire, handleLogout, adminWarning, showWarning };
};