import { useState, useCallback } from 'react';
import { api } from './api-client';

export interface AllocationOverrideRequest {
    allocationId: string;
    percentage?: number;
    startDate?: string;
    endDate?: string;
    isAdminOverride: boolean;
    overrideReason: string;
    authorizedById: string;
}

export interface AllocationResponse {
    id: string;
    projectId: string;
    employeeId: string;
    roleId: string;
    startDate: string;
    endDate: string;
    percentage: number;
    isActive: boolean;
    hasAdminOverride?: boolean;
}

interface UseAllocationOverrideResult {
    updateAllocation: (request: AllocationOverrideRequest) => Promise<AllocationResponse>;
    loading: boolean;
    error: string | null;
    clearError: () => void;
}

export function useAllocationOverride(): UseAllocationOverrideResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateAllocation = useCallback(async (request: AllocationOverrideRequest): Promise<AllocationResponse> => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.put<AllocationResponse>(`/allocations/${request.allocationId}`, {
                percentage: request.percentage,
                startDate: request.startDate,
                endDate: request.endDate,
                isAdminOverride: request.isAdminOverride,
                overrideReason: request.overrideReason,
                authorizedById: request.authorizedById,
            });
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update allocation';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return { updateAllocation, loading, error, clearError };
}
