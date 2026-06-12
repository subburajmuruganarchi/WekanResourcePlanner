import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { canAccessRoute, getHomeRoute } from '@/lib/home-route';

interface RoleRouteProps {
    children: React.ReactNode;
}

/** Redirects to role home when user opens a URL their role cannot access (sidebar bypass). */
export function RoleRoute({ children }: RoleRouteProps) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const path = location.pathname.split('/').slice(0, 2).join('/') || location.pathname;
    const basePath =
        path.startsWith('/projects/') ? '/projects' : path;

    if (!canAccessRoute(user.role, basePath)) {
        return <Navigate to={getHomeRoute(user.role)} replace />;
    }

    return <>{children}</>;
}
