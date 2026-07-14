import { useCallback } from 'react';
import useSWR from 'swr';
import { api } from './api-client';
import { listSwrOptions } from './swr-defaults';
import type { Employee } from '@/types/api';

interface UseEmployeesOptions {
    /** When true, PMs only receive employees allocated to their managed projects. */
    allocatedToMyProjects?: boolean;
    /** When true, only active employees are returned. */
    activeOnly?: boolean;
    /** When true, include current project assignments per employee. */
    includeAssignments?: boolean;
}

interface UseEmployeesResult {
    employees: Employee[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    createEmployee: (data: Partial<Employee>) => Promise<void>;
    updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
}

function employeesKey(options: {
    allocatedToMyProjects: boolean;
    activeOnly: boolean;
    includeAssignments: boolean;
}): string {
    const params = new URLSearchParams();
    if (options.allocatedToMyProjects) params.set('allocatedToMyProjects', 'true');
    if (options.activeOnly) params.set('isActive', 'true');
    if (options.includeAssignments) params.set('includeAssignments', 'true');
    const q = params.toString();
    return `/employees${q ? `?${q}` : ''}`;
}

export function useEmployees(options: UseEmployeesOptions = {}): UseEmployeesResult {
    const {
        allocatedToMyProjects = false,
        activeOnly = true,
        includeAssignments = false,
    } = options;
    const key = employeesKey({ allocatedToMyProjects, activeOnly, includeAssignments });

    const { data, error, isLoading, mutate } = useSWR<Employee[]>(
        key,
        (url) => api.get<Employee[]>(url),
        listSwrOptions
    );

    const refetch = useCallback(() => {
        void mutate();
    }, [mutate]);

    const createEmployee = async (payload: Partial<Employee>) => {
        await api.post('/employees', payload);
        await mutate();
    };

    const updateEmployee = async (id: string, payload: Partial<Employee>) => {
        await api.patch(`/employees/${id}`, payload);
        await mutate();
    };

    return {
        employees: data ?? [],
        loading: isLoading && !data,
        error: error instanceof Error ? error.message : error ? String(error) : null,
        refetch,
        createEmployee,
        updateEmployee,
    };
}

interface UseEmployeeResult {
    employee: Employee | null;
    loading: boolean;
    error: string | null;
}

export function useEmployee(id: string | undefined): UseEmployeeResult {
    const key = id ? `/employees/${id}` : null;
    const { data, error, isLoading } = useSWR<Employee>(
        key,
        (url) => api.get<Employee>(url),
        listSwrOptions
    );

    return {
        employee: data ?? null,
        loading: Boolean(id) && isLoading && !data,
        error: error instanceof Error ? error.message : error ? String(error) : null,
    };
}
