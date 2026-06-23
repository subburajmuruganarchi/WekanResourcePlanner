import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/roles';
import { getNavGroupsForRole } from '@/lib/navigation-config';
import { BrandLogo } from '@/components/brand/brand-logo';
import {
    getRoleDisplayLabel,
    getWorkspacePersonaLabel,
    normalizeRoleName,
} from '@/lib/role-utils';

function canAccessItem(roles: string[] | '*', role: string | undefined): boolean {
    if (!role) return false;
    const canonical = normalizeRoleName(role);
    if (canonical === ROLES.ADMIN) return true;
    if (roles === '*') return true;
    return roles.includes(canonical);
}

export function Sidebar() {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const accessRole = normalizeRoleName(user?.role);
    const roleLabel = getRoleDisplayLabel(user?.role, {
        jobRole: user?.jobRole,
        position: user?.position,
    });
    const workspaceLabel = getWorkspacePersonaLabel(user?.role);
    const navGroups = getNavGroupsForRole(accessRole);

    const initials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const profileTitle = user?.name ? `${user.name} · ${roleLabel}` : roleLabel;

    return (
        <aside
            className={cn(
                'relative bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 z-20',
                'transition-[width] duration-300 ease-in-out',
                collapsed ? 'w-[72px]' : 'w-[260px]'
            )}
            aria-label="Main navigation"
        >
            <div className={cn('border-b border-slate-100', collapsed ? 'p-3' : 'px-4 py-4')}>
                <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                    <BrandLogo className={collapsed ? 'h-9 w-9' : 'h-9 w-9'} />
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-base tracking-tight">R360</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{workspaceLabel}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav-scroll flex-1 overflow-y-auto py-4 px-2 space-y-6">
                {navGroups.map((group) => {
                    const items = group.items.filter((item) => canAccessItem(item.roles, accessRole));
                    if (items.length === 0) return null;
                    return (
                        <div key={group.title}>
                            {!collapsed && (
                                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    {group.title}
                                </p>
                            )}
                            <ul className="space-y-0.5">
                                {items.map((item) => (
                                    <li key={item.path + item.label}>
                                        <NavLink
                                            to={item.path}
                                            end={item.path === '/executive' || item.path === '/delivery' || item.path === '/pm' || item.path === '/workspace'}
                                            title={collapsed ? item.label : undefined}
                                            className={({ isActive }) =>
                                                cn(
                                                    'flex items-center rounded-xl transition-all duration-200',
                                                    collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                                                    isActive
                                                        ? 'enterprise-nav-active font-semibold'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                                )
                                            }
                                        >
                                            <item.icon className="w-[18px] h-[18px] shrink-0" />
                                            {!collapsed && (
                                                <span className="text-sm truncate">{item.label}</span>
                                            )}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </nav>

            <div className={cn('border-t border-slate-100 p-3', collapsed && 'flex justify-center')}>
                {!collapsed ? (
                    <div
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                        title={profileTitle}
                    >
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{roleLabel}</p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold"
                        title={profileTitle}
                    >
                        {initials ?? '?'}
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
        </aside>
    );
}
