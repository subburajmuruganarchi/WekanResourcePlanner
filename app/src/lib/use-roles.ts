import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

export interface Role {
    id: string;
    name: string;
    isActive: boolean;
}

export function useRoles() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRoles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<Role[]>('/roles');
            setRoles(data);
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    return { roles, loading, refetch: fetchRoles };
}
