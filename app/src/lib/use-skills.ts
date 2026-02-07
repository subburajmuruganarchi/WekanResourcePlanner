import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

export interface Skill {
    id: string;
    name: string;
    category: string;
    isActive: boolean;
}

export function useSkills() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSkills = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<Skill[]>('/skills');
            setSkills(data);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    return { skills, loading, refetch: fetchSkills };
}
