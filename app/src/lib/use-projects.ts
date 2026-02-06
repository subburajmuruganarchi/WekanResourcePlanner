import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';
import type { Project } from '@/types/api';

interface UseProjectsResult {
    projects: Project[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useProjects(): UseProjectsResult {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<Project[]>('/projects');
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return { projects, loading, error, refetch: fetchProjects };
}

interface UseProjectResult {
    project: Project | null;
    loading: boolean;
    error: string | null;
}

export function useProject(id: string | undefined): UseProjectResult {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const fetchProject = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.get<Project>(`/projects/${id}`);
                setProject(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch project');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    return { project, loading, error };
}
