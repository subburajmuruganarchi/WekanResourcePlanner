import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';
import type { Employee } from '@/types/api';

interface UseEmployeesResult {
    employees: Employee[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    createEmployee: (data: Partial<Employee>) => Promise<void>;
    updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
}

export function useEmployees(): UseEmployeesResult {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<Employee[]>('/employees');
            setEmployees(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const createEmployee = async (data: Partial<Employee>) => {
        try {
            await api.post('/employees', data);
            fetchEmployees();
        } catch (err) {
            throw err;
        }
    };

    const updateEmployee = async (id: string, data: Partial<Employee>) => {
        try {
            await api.patch(`/employees/${id}`, data);
            fetchEmployees();
        } catch (err) {
            throw err;
        }
    };

    return { employees, loading, error, refetch: fetchEmployees, createEmployee, updateEmployee };
}

interface UseEmployeeResult {
    employee: Employee | null;
    loading: boolean;
    error: string | null;
}

export function useEmployee(id: string | undefined): UseEmployeeResult {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const fetchEmployee = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.get<Employee>(`/employees/${id}`);
                setEmployee(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch employee');
            } finally {
                setLoading(false);
            }
        };

        fetchEmployee();
    }, [id]);

    return { employee, loading, error };
}
