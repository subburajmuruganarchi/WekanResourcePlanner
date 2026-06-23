import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';
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
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const query = forTimeEntry ? '?forTimeEntry=true' : '';
            const data = await api.get<Project[]>(`/projects${query}`);
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, [forTimeEntry]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        const onChanged = () => void fetchProjects();
        window.addEventListener(PROJECTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onChanged);
    }, [fetchProjects]);

    const createProject = async (data: Partial<Project>) => {
        try {
            await api.post('/projects', data);
            fetchProjects();
        } catch (err) {
            throw err;
        }
    };

    const updateProject = async (id: string, data: Partial<Project>) => {
        try {
            await api.put(`/projects/${id}`, data);
            fetchProjects();
        } catch (err) {
            throw err;
        }
    };

    return { projects, loading, error, refetch: fetchProjects, createProject, updateProject };
}

interface UseProjectResult {
    project: Project | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useProject(id: string | undefined): UseProjectResult {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!id) {
            setProject(null);
            setLoading(false);
            return;
        }

        setProject(null);
        setLoading(true);
        setError(null);

        let cancelled = false;
        api.get<Project>(`/projects/${id}`)
            .then((data) => {
                if (!cancelled) setProject(data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch project');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, refreshKey]);

    const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

    return { project, loading, error, refetch };
}
