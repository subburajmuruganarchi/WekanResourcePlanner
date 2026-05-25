import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

export interface RankedEmployee {
    id: string;
    name: string;
    /** System access role */
    role: string;
    roleId?: string;
    jobRoleName?: string;
    jobRoleId?: string;
    suggestedAllocationRoleId?: string;
    suggestedAllocationRoleName?: string;
    matchingRoleEfforts?: { roleId: string; roleName: string; remainingHeadcount: number }[];
    primarySkill: string;
    matchingSkills?: { name: string; level: string }[];
    skillLevel: string;
    availability: number;
    experienceYears: number;
    matchScore: number;
    factors: {
        skillMatch: boolean;
        availabilityScore: number;
        experienceScore: number;
    };
    currentAllocations: {
        id: string;
        projectId: string;
        projectName: string;
        roleId?: string;
        roleName?: string;
        percentage: number;
        startDate: string;
        endDate: string;
        skillId?: string;
    }[];
    isAllocatedToProject: boolean;
}

interface UseRankedEmployeesParams {
    projectId?: string;
    skill?: string;
    startDate?: string;
    endDate?: string;
}

interface UseRankedEmployeesResult {
    rankedEmployees: RankedEmployee[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useRankedEmployees(params: UseRankedEmployeesParams = {}): UseRankedEmployeesResult {
    const [rankedEmployees, setRankedEmployees] = useState<RankedEmployee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRankedEmployees = useCallback(async () => {
        if (!params.projectId) {
            setRankedEmployees([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('projectId', params.projectId);
            if (params.skill) queryParams.append('skill', params.skill);
            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);

            const data = await api.get<RankedEmployee[]>(`/allocations/rank?${queryParams.toString()}`);
            setRankedEmployees(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ranked employees');
        } finally {
            setLoading(false);
        }
    }, [params.projectId, params.skill, params.startDate, params.endDate]);

    useEffect(() => {
        fetchRankedEmployees();
    }, [fetchRankedEmployees]);

    return { rankedEmployees, loading, error, refetch: fetchRankedEmployees };
}
