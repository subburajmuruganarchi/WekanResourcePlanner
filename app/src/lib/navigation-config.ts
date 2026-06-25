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
    Building2,
    Radar,
    TrendingUp,
    AlertTriangle,
    Milestone,
    GanttChart,
    Home,
    Brain,
    type LucideIcon,
} from 'lucide-react';
import { ROLES, type SystemRoleName } from './roles';
import { normalizeRoleName } from './role-utils';

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
                { label: 'Portfolio Health', path: '/executive/portfolio-health', icon: Building2, roles: [ROLES.CEO] },
                { label: 'Customer Delivery', path: '/executive/customer-delivery', icon: FolderKanban, roles: [ROLES.CEO] },
                { label: 'Strategic Capacity', path: '/executive/capacity', icon: TrendingUp, roles: [ROLES.CEO] },
                { label: 'OKR Alignment', path: '/okrs', icon: Target, roles: [ROLES.CEO] },
                { label: 'Risk Radar', path: '/executive/risk-radar', icon: Radar, roles: [ROLES.CEO] },
                { label: 'Reports', path: '/reports', icon: FileBarChart, roles: [ROLES.CEO] },
                { label: 'AI Executive Brief', path: '/executive/brief', icon: Brain, roles: [ROLES.CEO] },
            ],
        },
    ],
    [ROLES.DELIVERY_MANAGER]: [
        {
            title: 'Delivery Command',
            items: [
                { label: 'Command Center', path: '/delivery', icon: LayoutDashboard, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Portfolio Projects', path: '/projects', icon: FolderKanban, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Milestones', path: '/delivery/milestones', icon: Milestone, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Resource Planning', path: '/allocation', icon: Users, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Capacity Forecast', path: '/delivery/capacity', icon: TrendingUp, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'RAID Management', path: '/delivery/raid', icon: AlertTriangle, roles: [ROLES.DELIVERY_MANAGER] },
                { label: 'Approvals', path: '/pm-approvals', icon: ClipboardCheck, roles: [ROLES.DELIVERY_MANAGER] },
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
                { label: 'Timeline', path: '/pm/timeline', icon: GanttChart, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Team', path: '/pm/team', icon: Users, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Resource Allocation', path: '/allocation', icon: CalendarRange, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Reports', path: '/pm/status-report', icon: FileBarChart, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Risks', path: '/pm/risks', icon: AlertTriangle, roles: [ROLES.PROJECT_MANAGER] },
                { label: 'Time & Approvals', path: '/time-entry', icon: Clock, roles: [ROLES.PROJECT_MANAGER] },
            ],
        },
    ],
    [ROLES.EMPLOYEE]: [
        {
            title: 'My Workspace',
            items: [
                { label: 'My Workspace', path: '/workspace', icon: Home, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'My OKRs', path: '/okrs', icon: Target, roles: '*' },
            ],
        },
    ],
    [ROLES.USER]: [
        {
            title: 'My Workspace',
            items: [
                { label: 'My Workspace', path: '/workspace', icon: Home, roles: [ROLES.EMPLOYEE, ROLES.USER] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.EMPLOYEE, ROLES.USER] },
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
                { label: 'Weekly Planner', path: '/weekly-planner', icon: CalendarRange, roles: [ROLES.ADMIN] },
                { label: 'Time Tracking', path: '/time-entry', icon: Clock, roles: [ROLES.ADMIN] },
                { label: 'Approvals', path: '/pm-approvals', icon: ClipboardCheck, roles: [ROLES.ADMIN] },
                { label: 'Reports', path: '/reports', icon: FileBarChart, roles: [ROLES.ADMIN] },
                { label: 'OKRs', path: '/okrs', icon: Target, roles: [ROLES.ADMIN] },
                { label: 'AI Insights', path: '/insights', icon: Sparkles, roles: [ROLES.ADMIN] },
            ],
        },
        {
            title: 'Admin',
            items: [
                { label: 'Inputs', path: '/inputs', icon: Upload, roles: [ROLES.ADMIN] },
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
    '/executive/portfolio-health': [ROLES.CEO],
    '/executive/customer-delivery': [ROLES.CEO],
    '/executive/capacity': [ROLES.CEO],
    '/executive/risk-radar': [ROLES.CEO],
    '/executive/brief': [ROLES.CEO],
    '/delivery': [ROLES.DELIVERY_MANAGER],
    '/delivery/milestones': [ROLES.DELIVERY_MANAGER],
    '/delivery/capacity': [ROLES.DELIVERY_MANAGER],
    '/delivery/raid': [ROLES.DELIVERY_MANAGER],
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
    '/allocation': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/weekly-planner': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER],
    '/time-entry': [ROLES.EMPLOYEE, ROLES.USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/pm-approvals': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
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
    if (canonical === ROLES.ADMIN) return PERSONA_NAV[ROLES.ADMIN] ?? [];
    if (canonical === ROLES.USER) {
        return PERSONA_NAV[ROLES.USER] ?? PERSONA_NAV[ROLES.EMPLOYEE] ?? [];
    }
    return PERSONA_NAV[canonical] ?? PERSONA_NAV[ROLES.EMPLOYEE] ?? [];
}

export function canAccessNavPath(role: string | undefined, path: string): boolean {
    if (!role) return false;
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
    '/executive/portfolio-health': { title: 'Portfolio Health', breadcrumb: ['Executive', 'Portfolio'] },
    '/executive/customer-delivery': { title: 'Customer Delivery', breadcrumb: ['Executive', 'Customers'] },
    '/executive/capacity': { title: 'Strategic Capacity', breadcrumb: ['Executive', 'Capacity'] },
    '/executive/risk-radar': { title: 'Risk Radar', breadcrumb: ['Executive', 'Risk'] },
    '/executive/brief': { title: 'AI Executive Brief', breadcrumb: ['Executive', 'AI Brief'] },
    '/delivery': { title: 'Delivery Command Center', breadcrumb: ['Delivery', 'Command Center'] },
    '/delivery/milestones': { title: 'Milestones', breadcrumb: ['Delivery', 'Milestones'] },
    '/delivery/capacity': { title: 'Capacity Forecast', breadcrumb: ['Delivery', 'Capacity'] },
    '/delivery/raid': { title: 'RAID Management', breadcrumb: ['Delivery', 'RAID'] },
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
    '/reports': { title: 'Reports', breadcrumb: ['Operations', 'Reports'] },
    '/insights': { title: 'AI Insights', breadcrumb: ['Intelligence', 'Insights'] },
    '/okrs': { title: 'OKRs', breadcrumb: ['Operations', 'OKRs'] },
    '/inputs': { title: 'Inputs', breadcrumb: ['Admin', 'Inputs'] },
    '/user-control': { title: 'User Management', breadcrumb: ['Admin', 'Users'] },
    '/portfolios': { title: 'Portfolios', breadcrumb: ['Admin', 'Portfolios'] },
    '/system-health': { title: 'Settings', breadcrumb: ['Admin', 'Settings'] },
};
