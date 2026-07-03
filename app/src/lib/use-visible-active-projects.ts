import { useMemo } from 'react';
import { useProjects } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { getMvpFeatures } from '@/lib/mvp-config';
import { isDeliveryManager } from '@/lib/roles';
import { usePortfolioScope } from '@/lib/use-portfolio-scope';
import { isOperationalProject } from '@/lib/project-status';

/** Active projects visible to the current user (all projects for DM in MVP mode). */
export function useVisibleActiveProjects() {
    const { user } = useAuth();
    const { projects, loading } = useProjects();
    const { projectIds } = usePortfolioScope(user?.role);
    const mvpMode = getMvpFeatures().mvpMode;

    const visible = useMemo(() => {
        const active = projects.filter((p) => isOperationalProject(p));
        if (mvpMode && isDeliveryManager(user?.role)) {
            return active;
        }
        if (projectIds.length > 0) {
            return active.filter((p) => projectIds.includes(p.id));
        }
        if (isDeliveryManager(user?.role)) {
            return [];
        }
        return active;
    }, [projects, projectIds, user?.role, mvpMode]);

    return { projects: visible, loading };
}
