import { useState, useEffect, useCallback } from 'react';
import { api } from './api-client';
import type { Project } from '@/types/api';

interface UseProjectsResult {
    projects: Project[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    createProject: (data: Partial<Project>) => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
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

    const fetchProject = useCallback(async () => {
        if (!id) {
            setProject(null);
            setLoading(false);
            return;
        }
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
    }, [id]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    return { project, loading, error, refetch: fetchProject };
}
