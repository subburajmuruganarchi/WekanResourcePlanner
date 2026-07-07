import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { X } from 'lucide-react';
import { ROLES } from '@/lib/roles';
import { getNavGroupsForRole } from '@/lib/navigation-config';
import { BrandLogo } from '@/components/brand/brand-logo';
import { getRoleDisplayLabel, getWorkspacePersonaLabel, normalizeRoleName } from '@/lib/role-utils';

function canAccessItem(roles: string[] | '*', role: string | undefined): boolean {
    if (!role) return false;
    const canonical = normalizeRoleName(role);
    if (canonical === ROLES.ADMIN) return true;
    if (roles === '*') return true;
    return roles.includes(canonical);
}

interface MobileNavProps {
    open: boolean;
    onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
    const { user } = useAuth();
    const accessRole = normalizeRoleName(user?.role);
    const navGroups = getNavGroupsForRole(accessRole);
    const workspaceLabel = getWorkspacePersonaLabel(user?.role);
    const roleLabel = getRoleDisplayLabel(user?.role, {
        jobRole: user?.jobRole,
        position: user?.position,
    });

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                aria-label="Close navigation"
                onClick={onClose}
            />
            <aside className="absolute inset-y-0 left-0 w-[min(300px,85vw)] bg-card border-r border-border flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-9 w-9" />
                        <div>
                            <p className="font-bold text-card-foreground">R360</p>
                            <p className="text-[10px] text-muted-foreground">{workspaceLabel}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="sidebar-nav-scroll flex-1 overflow-y-auto py-4 px-2 space-y-6">
                    {navGroups.map((group) => {
                        const items = group.items.filter((item) => canAccessItem(item.roles, accessRole));
                        if (items.length === 0) return null;
                        return (
                            <div key={group.title}>
                                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {group.title}
                                </p>
                                <ul className="space-y-0.5">
                                    {items.map((item) => (
                                        <li key={item.path + item.label}>
                                            <NavLink
                                                to={item.path}
                                                end={
                                                    item.path === '/executive' ||
                                                    item.path === '/delivery' ||
                                                    item.path === '/pm' ||
                                                    item.path === '/workspace'
                                                }
                                                onClick={onClose}
                                                className={({ isActive }) =>
                                                    cn(
                                                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                        isActive
                                                            ? 'enterprise-nav-active font-semibold'
                                                            : 'text-muted-foreground hover:bg-muted hover:text-card-foreground font-medium'
                                                    )
                                                }
                                            >
                                                <item.icon className="w-[18px] h-[18px] shrink-0" />
                                                <span className="text-sm truncate">{item.label}</span>
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </nav>

                <div className="border-t border-border p-4">
                    <p className="text-sm font-medium text-card-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
            </aside>
        </div>
    );
}
