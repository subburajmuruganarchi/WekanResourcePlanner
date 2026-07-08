import { ROUTE_TITLES } from '@/lib/navigation-config';

export interface CopilotPagePrompt {
    label: string;
    query: string;
}

export interface CopilotPageContext {
    path: string;
    title: string;
    breadcrumb: string[];
    summary: string;
    prompts: CopilotPagePrompt[];
}

function resolveRouteKey(pathname: string): string | null {
    const keys = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (pathname === key || pathname.startsWith(`${key}/`)) return key;
    }
    return null;
}

const PAGE_PROMPTS: Record<string, CopilotPagePrompt[]> = {
    '/allocation': [
        { label: 'Who is over-allocated this week?', query: 'over allocated employees' },
        { label: 'Suggest bench moves', query: 'bench reallocation' },
    ],
    '/bench': [
        { label: 'Who is available for new work?', query: 'bench availability' },
        { label: 'Match bench skills to open roles', query: 'bench skill match' },
    ],
    '/skills-matrix': [
        { label: 'Where are our skill gaps?', query: 'skill gaps' },
        { label: 'Who has expert-level React skills?', query: 'expert react skills' },
    ],
    '/skills': [
        { label: 'Which skills are unused?', query: 'unused skills' },
        { label: 'Suggest new skills to add', query: 'suggest skills' },
    ],
    '/audit-center': [
        { label: 'Summarize recent admin actions', query: 'audit summary' },
        { label: 'Any failed syncs recently?', query: 'failed syncs' },
    ],
    '/delivery': [
        { label: 'Which projects need attention?', query: 'portfolio attention projects' },
        { label: 'Recommend resource moves', query: 'resource optimization' },
    ],
    '/executive': [
        { label: 'Summarize company delivery health', query: 'executive delivery health summary' },
        { label: 'Which projects are at risk?', query: 'customer delivery risk' },
    ],
    '/pm': [
        { label: 'Generate weekly status report', query: 'weekly status report' },
        { label: 'Who is missing timesheets?', query: 'missing team timesheets' },
    ],
    '/approvals': [
        { label: 'What approvals are blocking delivery?', query: 'pending approvals' },
        { label: 'Summarize this week’s submissions', query: 'timesheet submissions' },
    ],
    '/time-entry': [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries' },
        { label: 'How am I tracking this week?', query: 'week progress' },
    ],
    '/workspace': [
        { label: 'What should I focus on this week?', query: 'my week focus' },
        { label: 'Show my project allocations', query: 'my project allocations' },
    ],
    '/projects': [
        { label: 'Which projects are understaffed?', query: 'understaffed projects' },
        { label: 'Summarize portfolio health', query: 'portfolio delivery health' },
    ],
    '/inputs': [
        { label: 'When was the last successful sync?', query: 'last sync status' },
        { label: 'Any sheet import errors?', query: 'sync errors' },
    ],
    '/system-health': [
        { label: 'Is the system healthy?', query: 'system health' },
        { label: 'What warnings need attention?', query: 'system warnings' },
    ],
    '/resource-requests': [
        { label: 'Which requests are pending?', query: 'pending resource requests' },
        { label: 'Who requested resources this week?', query: 'recent resource requests' },
    ],
};

const PAGE_SUMMARIES: Record<string, string> = {
    '/allocation': 'Resource planning and weekly allocations',
    '/bench': 'Under-utilized employees available for staffing',
    '/skills-matrix': 'Employee skill coverage across the organization',
    '/skills': 'Global skill catalog management',
    '/audit-center': 'Allocation overrides and sheet sync history',
    '/delivery': 'Portfolio delivery command center',
    '/executive': 'Executive delivery and capacity overview',
    '/pm': 'Project manager workspace',
    '/approvals': 'Timesheet and approval queue',
    '/time-entry': 'Weekly time logging',
    '/workspace': 'Employee personal workspace — projects, allocation, and weekly plan',
    '/projects': 'Projects and employee directory',
    '/inputs': 'Google Sheet import and sync controls',
    '/system-health': 'Platform health and diagnostics',
    '/resource-requests': 'Staffing requests awaiting delivery review',
};

export function getCopilotPageContext(pathname: string): CopilotPageContext {
    const routeKey = resolveRouteKey(pathname);
    const meta = routeKey ? ROUTE_TITLES[routeKey] : null;

    return {
        path: pathname,
        title: meta?.title ?? 'R360',
        breadcrumb: meta?.breadcrumb ?? ['Workspace'],
        summary: routeKey ? (PAGE_SUMMARIES[routeKey] ?? 'General workspace assistance') : 'General workspace assistance',
        prompts: routeKey ? (PAGE_PROMPTS[routeKey] ?? []) : [],
    };
}
