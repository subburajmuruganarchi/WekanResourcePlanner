import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

export interface RankedEmployee {
    id: string;
    name: string;
    role: string;
    primarySkill: string;
    skillLevel: string;
    availability: number;
    experienceYears: number;
    matchScore: number;
    factors: {
        skillMatch: boolean;
        availabilityScore: number;
        experienceScore: number;
    };
    currentAllocations: { projectId: string; projectName: string; percentage: number }[];
    isAllocatedToProject: boolean;
}

interface UseRankedEmployeesParams {
    projectId?: string;
    skill?: string;
}

interface UseRankedEmployeesResult {
    rankedEmployees: RankedEmployee[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useRankedEmployees(params: UseRankedEmployeesParams = {}): UseRankedEmployeesResult {
    const [rankedEmployees, setRankedEmployees] = useState<RankedEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRankedEmployees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (params.projectId) queryParams.append('projectId', params.projectId);
            if (params.skill) queryParams.append('skill', params.skill);

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/allocations/rank?${queryString}` : '/allocations/rank';

            const data = await api.get<RankedEmployee[]>(endpoint);
            setRankedEmployees(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ranked employees');
        } finally {
            setLoading(false);
        }
    }, [params.projectId, params.skill]);

    useEffect(() => {
        fetchRankedEmployees();
    }, [fetchRankedEmployees]);

    return { rankedEmployees, loading, error, refetch: fetchRankedEmployees };
}
