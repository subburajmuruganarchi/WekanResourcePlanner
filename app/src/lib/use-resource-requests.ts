import { useCallback, useEffect, useState } from 'react';
import { api } from './api-client';

export type ResourceRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ResourceRequest {
    id: string;
    projectId: string;
    projectName?: string;
    projectCode?: string;
    employeeId: string;
    employeeName?: string;
    requestedById: string;
    requestedByName?: string;
    roleId?: string;
    roleName?: string;
    allocationPercent: number;
    startDate: string;
    endDate: string;
    justification: string;
    status: ResourceRequestStatus;
    reviewedById?: string;
    reviewedByName?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    allocationId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export function useResourceRequests(status?: ResourceRequestStatus) {
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const query = status ? `?status=${encodeURIComponent(status)}` : '';
            const data = await api.get<ResourceRequest[]>(`/resource-requests${query}`);
            setRequests(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load resource requests');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    const createRequest = async (payload: {
        projectId: string;
        employeeId: string;
        roleId?: string;
        allocationPercent: number;
        startDate: string;
        endDate: string;
        justification: string;
    }) => {
        await api.post('/resource-requests', payload);
        await fetchRequests();
    };

    const reviewRequest = async (
        id: string,
        action: 'approve' | 'reject',
        reviewNotes?: string,
        createAllocation = true
    ) => {
        await api.patch(`/resource-requests/${id}/review`, { action, reviewNotes, createAllocation });
        await fetchRequests();
    };

    const cancelRequest = async (id: string) => {
        await api.patch(`/resource-requests/${id}/cancel`, {});
        await fetchRequests();
    };

    return {
        requests,
        loading,
        error,
        refetch: fetchRequests,
        createRequest,
        reviewRequest,
        cancelRequest,
    };
}
