import { useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { api } from './api-client';
import { listSwrOptions } from './swr-defaults';
import type { Project } from '@/types/api';

interface UseProjectsOptions {
    /** When true, employees receive all Active projects (time entry picker). Default: allocated only. */
    forTimeEntry?: boolean;
}

interface UseProjectsResult {
    projects: Project[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    createProject: (data: Partial<Project>) => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
}

export const PROJECTS_CHANGED_EVENT = 'r360-projects-changed';

export function notifyProjectsChanged(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT));
    }
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
    const { forTimeEntry = false } = options;
    const key = `/projects${forTimeEntry ? '?forTimeEntry=true' : ''}`;

    const { data, error, isLoading, mutate } = useSWR<Project[]>(
        key,
        (url) => api.get<Project[]>(url),
        listSwrOptions
    );

    useEffect(() => {
        const onChanged = () => void mutate();
        window.addEventListener(PROJECTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onChanged);
    }, [mutate]);

    const refetch = useCallback(() => {
        void mutate();
    }, [mutate]);

    const createProject = async (payload: Partial<Project>) => {
        await api.post('/projects', payload);
        await mutate();
        notifyProjectsChanged();
    };

    const updateProject = async (id: string, payload: Partial<Project>) => {
        await api.put(`/projects/${id}`, payload);
        await mutate();
        notifyProjectsChanged();
    };

    return {
        projects: data ?? [],
        loading: isLoading && !data,
        error: error instanceof Error ? error.message : error ? String(error) : null,
        refetch,
        createProject,
        updateProject,
    };
}

interface UseProjectResult {
    project: Project | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useProject(id: string | undefined): UseProjectResult {
    const key = id ? `/projects/${id}` : null;
    const { data, error, isLoading, mutate } = useSWR<Project>(
        key,
        (url) => api.get<Project>(url),
        listSwrOptions
    );

    const refetch = useCallback(() => {
        void mutate();
    }, [mutate]);

    return {
        project: data ?? null,
        loading: Boolean(id) && isLoading && !data,
        error: error instanceof Error ? error.message : error ? String(error) : null,
        refetch,
    };
}
