import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CalendarRange,
    Clock,
    ClipboardCheck,
    FileBarChart,
    Sparkles,
    Shield,
    Upload,
    Target,
    Settings,
    Briefcase,
    Radar,
    TrendingUp,
    AlertTriangle,
    GanttChart,
    Home,
    Grid3x3,
    ClipboardList,
    Wrench,
    UserPlus,
    type LucideIcon,
} from 'lucide-react';
import { ROLES, type SystemRoleName } from './roles';
import { normalizeRoleName } from './role-utils';
import { getMvpFeatures, isNavPathEnabled } from './mvp-config';

export type NavItemDef = {
    label: string;
    path: string;
    icon: LucideIcon;
    /** Roles allowed; '*' = all authenticated */
    roles: SystemRoleName[] | '*';
    /** Hide from persona nav (legacy ops link only) */
    legacy?: boolean;
};

export type NavGroupDef = {
    title: string;
    items: NavItemDef[];
};

/** Persona-primary navigation — shown first per role */
export const PERSONA_NAV: Record<string, NavGroupDef[]> = {
    [ROLES.CEO]: [
        {
            title: 'Executive Command',
            items: [
                { label: 'Executive Dashboard', path: '/executive', icon: LayoutDashboard, roles: [ROLES.CEO] },
                { label: 'Portfolio Projects', path: '/projects', icon: FolderKanban, roles: [ROLES.CEO] },
                { label: 'Resource Allocation', path: '/allocation', icon: Users, roles: [ROLES.CEO] },
                { label: 'Risk Radar', path: '/executive/risk-radar', icon: Radar, roles: [ROLES.CEO] },
                { label: 'Bench Resources', path: '/bench', icon: Users, roles: [ROLES.CEO] },
                { label: 'Skills Matrix', path: '/skills-matrix', icon: Grid3x3, roles: [ROLES.CEO] },
                { label: 'OKR Alignment', path: '/okrs', icon: Target, roles: [ROLES.CEO] },
                { label: 'Reports', path: '/reports', icon: FileBarChart, roles: [ROLES.CEO] },
            ],
        },
    ],
    [ROLES.DELIVERY_MANAGER]: [
        {
            title: 'Delivery Command',
            items: [
                { label: 'Command Center', path: '/delivery', icon: LayoutDashboard, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Employees & Projects', path: '/projects', icon: FolderKanban, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Resource Allocation', path: '/allocation', icon: Users, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Capacity Forecast', path: '/delivery/capacity', icon: TrendingUp, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Approvals', path: '/approvals', icon: ClipboardCheck, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Resource Requests', path: '/resource-requests', icon: UserPlus, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Bench Resources', path: '/bench', icon: Users, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Skills Matrix', path: '/skills-matrix', icon: Grid3x3, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Reports', path: '/reports', icon: FileBarChart, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Suggested Actions', path: '/delivery/recommendations', icon: Sparkles, roles: [ROLES.DELIVERY_MANAGER] },
            ],
        },
    ],
    [ROLES.PROJECT_MANAGER]: [
        {
            title: 'Project Workspace',
            items: [
                { label: 'Project Dashboard', path: '/pm', icon: LayoutDashboard, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'All Projects', path: '/projects', icon: FolderKanban, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Timeline', path: '/pm/timeline', icon: GanttChart, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Team', path: '/pm/team', icon: Users, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Resource Allocation', path: '/allocation', icon: CalendarRange, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Reports', path: '/pm/status-report', icon: FileBarChart, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Risks', path: '/pm/risks', icon: AlertTriangle, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Approvals', path: '/approvals', icon: ClipboardCheck, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Resource Requests', path: '/resource-requests', icon: UserPlus, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Skills Matrix', path: '/skills-matrix', icon: Grid3x3, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.PROJECT_MANAGER] },
            ],
        },
    ],
    [ROLES.EMPLOYEE]: [
        {
            title: 'My Workspace',
            items: [
                { label: 'My Workspace', path: '/workspace', icon: Home, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Resource Allocation', path: '/allocation', icon: CalendarRange, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Resource Requests', path: '/resource-requests', icon: UserPlus, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'My OKRs', path: '/okrs', icon: Target, roles: '*' },
            ],
        },
    ],
    [ROLES.USER]: [
        {
            title: 'My Workspace',
            items: [
                { label: 'My Workspace', path: '/workspace', icon: Home, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Resource Allocation', path: '/allocation', icon: CalendarRange, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Resource Requests', path: '/resource-requests', icon: UserPlus, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'My OKRs', path: '/okrs', icon: Target, roles: '*' },
            ],
        },
    ],
    [ROLES.ADMIN]: [
        {
            title: 'Operations',
            items: [
                { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: [ROLES.ADMIN] },
                { label: 'Resource Planning', path: '/allocation', icon: Users, roles: [ROLES.ADMIN] },
                { label: 'Projects', path: '/projects', icon: FolderKanban, roles: [ROLES.ADMIN] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.ADMIN] },
                { label: 'Approvals', path: '/approvals', icon: ClipboardCheck, roles: [ROLES.ADMIN] },
                { label: 'Resource Requests', path: '/resource-requests', icon: UserPlus, roles: [ROLES.ADMIN] },
                { label: 'Bench Resources', path: '/bench', icon: Users, roles: [ROLES.ADMIN] },
                { label: 'Skills Matrix', path: '/skills-matrix', icon: Grid3x3, roles: [ROLES.ADMIN] },
                { label: 'Reports', path: '/reports', icon: FileBarChart, roles: [ROLES.ADMIN] },
                { label: 'OKRs', path: '/okrs', icon: Target, roles: [ROLES.ADMIN] },
                { label: 'AI Insights', path: '/insights', icon: Sparkles, roles: [ROLES.ADMIN] },
            ],
        },
        {
            title: 'Admin',
            items: [
                { label: 'Inputs', path: '/inputs', icon: Upload, roles: [ROLES.ADMIN] },
                { label: 'Skill Master', path: '/skills', icon: Wrench, roles: [ROLES.ADMIN] },
                { label: 'Audit Center', path: '/audit-center', icon: ClipboardList, roles: [ROLES.ADMIN] },
                { label: 'Portfolios', path: '/portfolios', icon: Briefcase, roles: [ROLES.ADMIN] },
                { label: 'User Management', path: '/user-control', icon: Shield, roles: [ROLES.ADMIN] },
                { label: 'Settings', path: '/system-health', icon: Settings, roles: [ROLES.ADMIN] },
            ],
        },
    ],
};

/** Flat route access map derived from all nav + legacy routes */
export const ROUTE_ACCESS: Record<string, SystemRoleName[] | '*'> = {
    '/workspace': [ROLES.EMPLOYEE, ROLES.USER],
    '/executive': [ROLES.CEO],
    '/executive/risk-radar': [ROLES.CEO],
    '/delivery': [ROLES.DELIVERY_MANAGER],
    '/delivery/capacity': [ROLES.DELIVERY_MANAGER],
    '/delivery/recommendations': [ROLES.DELIVERY_MANAGER],
    '/pm': [ROLES.PROJECT_MANAGER],
    '/pm/timeline': [ROLES.PROJECT_MANAGER],
    '/pm/team': [ROLES.PROJECT_MANAGER],
    '/pm/status-report': [ROLES.PROJECT_MANAGER],
    '/pm/risks': [ROLES.PROJECT_MANAGER],
    '/pm/decisions': [ROLES.PROJECT_MANAGER],
    '/pm/communication': [ROLES.PROJECT_MANAGER],
    '/dashboard': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/projects': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/allocation': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER, ROLES.EMPLOYEE, ROLES.USER],
    '/weekly-planner': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/time-entry': [ROLES.EMPLOYEE, ROLES.USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/pm-approvals': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/approvals': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/bench': [ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.CEO],
    '/skills': [ROLES.ADMIN],
    '/skills-matrix': [ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.CEO, ROLES.PROJECT_MANAGER],
    '/audit-center': [ROLES.ADMIN],
    '/resource-requests': [ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.PROJECT_MANAGER, ROLES.EMPLOYEE, ROLES.USER, ROLES.CEO],
    '/reports': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/insights': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/okrs': '*',
    '/inputs': [ROLES.ADMIN],
    '/user-control': [ROLES.ADMIN],
    '/portfolios': [ROLES.ADMIN],
    '/system-health': [ROLES.ADMIN],
};

export function getNavGroupsForRole(role: string | undefined): NavGroupDef[] {
    if (!role) return [];
    const canonical = normalizeRoleName(role);
    const flags = getMvpFeatures();
    const base =
        canonical === ROLES.ADMIN
            ? (PERSONA_NAV[ROLES.ADMIN] ?? [])
            : canonical === ROLES.USER
              ? (PERSONA_NAV[ROLES.USER] ?? PERSONA_NAV[ROLES.EMPLOYEE] ?? [])
              : (PERSONA_NAV[canonical] ?? PERSONA_NAV[ROLES.EMPLOYEE] ?? []);

    return base
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => isNavPathEnabled(item.path, flags)),
        }))
        .filter((group) => group.items.length > 0);
}

export function canAccessNavPath(role: string | undefined, path: string): boolean {
    if (!role) return false;
    if (!isNavPathEnabled(path)) return false;
    const canonical = normalizeRoleName(role);
    if (canonical === ROLES.ADMIN) return true;
    if (ROUTE_ACCESS[path]) {
        const allowed = ROUTE_ACCESS[path];
        if (allowed === '*') return true;
        return allowed.includes(canonical as SystemRoleName);
    }
    const two = path.split('/').slice(0, 2).join('/');
    const allowedPrefix = ROUTE_ACCESS[two];
    if (!allowedPrefix) return true;
    if (allowedPrefix === '*') return true;
    return allowedPrefix.includes(canonical as SystemRoleName);
}

export const ROUTE_TITLES: Record<string, { title: string; breadcrumb: string[] }> = {
    '/workspace': { title: 'My Workspace', breadcrumb: ['My Workspace', 'Home'] },
    '/executive': { title: 'Executive Dashboard', breadcrumb: ['Executive', 'Dashboard'] },
    '/executive/risk-radar': { title: 'Risk Radar', breadcrumb: ['Executive', 'Risk'] },
    '/delivery': { title: 'Delivery Command Center', breadcrumb: ['Delivery', 'Command Center'] },
    '/delivery/capacity': { title: 'Capacity Forecast', breadcrumb: ['Delivery', 'Capacity'] },
    '/delivery/recommendations': { title: 'Suggested Actions', breadcrumb: ['Delivery', 'Actions'] },
    '/pm': { title: 'Project Dashboard', breadcrumb: ['Project', 'Dashboard'] },
    '/pm/timeline': { title: 'Project Timeline', breadcrumb: ['Project', 'Timeline'] },
    '/pm/team': { title: 'Team', breadcrumb: ['Project', 'Team'] },
    '/pm/status-report': { title: 'Project Reports', breadcrumb: ['Project', 'Reports'] },
    '/pm/risks': { title: 'Project Risks', breadcrumb: ['Project', 'Risks'] },
    '/pm/decisions': { title: 'Decision Log', breadcrumb: ['Project', 'Decisions'] },
    '/pm/communication': { title: 'Communication', breadcrumb: ['Project', 'Communication'] },
    '/dashboard': { title: 'Resource Intelligence', breadcrumb: ['Workspace', 'Dashboard'] },
    '/allocation': { title: 'Resource Planning', breadcrumb: ['Workspace', 'Allocation'] },
    '/projects': { title: 'Projects', breadcrumb: ['Workspace', 'Projects'] },
    '/weekly-planner': { title: 'Weekly Planner', breadcrumb: ['Workspace', 'Planner'] },
    '/time-entry': { title: 'Time Intelligence', breadcrumb: ['Operations', 'Time Tracking'] },
    '/pm-approvals': { title: 'Approvals', breadcrumb: ['Operations', 'Approvals'] },
    '/approvals': { title: 'Approval Center', breadcrumb: ['Operations', 'Approvals'] },
    '/bench': { title: 'Bench Management', breadcrumb: ['Intelligence', 'Bench'] },
    '/skills': { title: 'Skill Master', breadcrumb: ['Admin', 'Skills'] },
    '/skills-matrix': { title: 'Skills Matrix', breadcrumb: ['Intelligence', 'Skills'] },
    '/audit-center': { title: 'Audit Center', breadcrumb: ['Admin', 'Audit'] },
    '/resource-requests': { title: 'Resource Requests', breadcrumb: ['Operations', 'Requests'] },
    '/reports': { title: 'Reports', breadcrumb: ['Operations', 'Reports'] },
    '/insights': { title: 'AI Insights', breadcrumb: ['Intelligence', 'Insights'] },
    '/okrs': { title: 'OKRs', breadcrumb: ['Operations', 'OKRs'] },
    '/inputs': { title: 'Inputs', breadcrumb: ['Admin', 'Inputs'] },
    '/user-control': { title: 'User Management', breadcrumb: ['Admin', 'Users'] },
    '/portfolios': { title: 'Portfolios', breadcrumb: ['Admin', 'Portfolios'] },
    '/system-health': { title: 'Settings', breadcrumb: ['Admin', 'Settings'] },
};
