import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { projectService } from '../../modules/projects/project.service';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { features } from '../../config/features';

const WEEKLY_CAPACITY = features.weeklyCapacityHours ?? 40;
const HOURS_PER_WORK_WEEK = 40; // 5 × 8h default when role uses hoursPerDay

export type AllocationSuggestionStatus = 'missing' | 'partial' | 'filled' | 'overload';

export interface AllocationRoleWeekSuggestion {
    weekStart: string;
    weekLabel: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    roleName: string;
    skillName?: string;
    headcountGap: number;
    recommendedHours: number;
    plannedHours: number;
    hoursToPlan: number;
    status: AllocationSuggestionStatus;
    message: string;
}

export interface AllocationSuggestionsResponse {
    weekStartFrom: string;
    weekStartTo: string;
    items: AllocationRoleWeekSuggestion[];
    summary: {
        roleGaps: number;
        projectsAffected: number;
        weeksAffected: number;
    };
}

function listWeekStarts(fromIso: string, toIso: string): string[] {
    const out: string[] = [];
    let cur = parseISO(fromIso);
    const end = parseISO(toIso);
    while (cur <= end) {
        out.push(format(cur, 'yyyy-MM-dd'));
        cur = addWeeks(cur, 1);
    }
    return out;
}

function weekOverlapsProject(weekStart: string, projectStart: string, projectEnd: string): boolean {
    const week = parseISO(weekStart);
    const weekEnd = addWeeks(week, 1);
    const start = parseISO(projectStart);
    const end = parseISO(projectEnd);
    return week < end && weekEnd > start;
}

function rolesMatch(employeeRole: string | undefined, requiredRole: string): boolean {
    if (!employeeRole?.trim()) return false;
    const a = employeeRole.toLowerCase().trim();
    const b = requiredRole.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

export async function buildAllocationSuggestions(params: {
    weekStartFrom: string;
    weekStartTo: string;
    projectId?: string;
}): Promise<AllocationSuggestionsResponse> {
    const currentMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const rangeFrom = params.weekStartFrom >= currentMonday ? params.weekStartFrom : currentMonday;

    const projects = await projectService.findAll({
        status: 'Active',
        ...(params.projectId ? {} : {}),
    });
    const activeProjects = params.projectId
        ? projects.filter((p) => p.id === params.projectId)
        : projects;

    const entries = await WeeklyAllocationEntry.find({
        week_start: { $gte: rangeFrom, $lte: params.weekStartTo },
        ...(params.projectId ? { project_id: params.projectId } : {}),
    })
        .populate<{ employee_id: { job_role?: string } }>('employee_id', 'job_role')
        .lean();

    const employeeWeekHours = new Map<string, number>();

    for (const entry of entries) {
        const projectId = entry.project_id?.toString();
        if (!projectId) continue;
        const week = format(new Date(entry.week_start), 'yyyy-MM-dd');
        const hours = entry.planned_hours ?? 0;

        const empId = entry.employee_id?.toString();
        if (empId) {
            const ewKey = `${empId}:${week}`;
            employeeWeekHours.set(ewKey, (employeeWeekHours.get(ewKey) ?? 0) + hours);
        }
    }

    const weeks = listWeekStarts(rangeFrom, params.weekStartTo);
    const items: AllocationRoleWeekSuggestion[] = [];

    for (const weekStart of weeks) {
        const weekLabel = format(parseISO(weekStart), 'MMM d');

        for (const project of activeProjects) {
            if (!weekOverlapsProject(weekStart, project.startDate, project.endDate)) continue;

            const roleEfforts = project.roleEfforts ?? [];
            const skillReqs = project.skillRequirements ?? [];

            const roleTargets = new Map<
                string,
                { roleName: string; skillName?: string; headcountGap: number; recommendedHours: number }
            >();

            for (const role of roleEfforts) {
                const roleName = role.roleName || 'Role';
                const headcount = role.originalHeadcount ?? 1;
                const gap = Math.max(0, role.remainingHeadcount ?? 0);
                const weeklyHours = round1((role.hoursPerDay ?? 8) * 5 * headcount);
                const existing = roleTargets.get(roleName.toLowerCase());
                if (existing) {
                    existing.recommendedHours = round1(existing.recommendedHours + weeklyHours);
                    existing.headcountGap = Math.max(existing.headcountGap, gap);
                } else {
                    roleTargets.set(roleName.toLowerCase(), {
                        roleName,
                        headcountGap: gap,
                        recommendedHours: weeklyHours,
                    });
                }
            }

            for (const skill of skillReqs) {
                const gap = Math.max(0, skill.remainingHeadcount ?? 0);
                if (gap <= 0 && (skill.originalHeadcount ?? 0) <= 0) continue;
                const roleName = skill.roleName || skill.skillName || 'Required role';
                const skillName = skill.skillName;
                const weeklyHours = round1(HOURS_PER_WORK_WEEK * Math.max(gap, skill.originalHeadcount ?? 1));
                const key = roleName.toLowerCase();
                const existing = roleTargets.get(key);
                if (existing) {
                    existing.skillName = skillName ?? existing.skillName;
                    existing.headcountGap = Math.max(existing.headcountGap, gap);
                    existing.recommendedHours = Math.max(existing.recommendedHours, weeklyHours);
                } else {
                    roleTargets.set(key, {
                        roleName,
                        skillName,
                        headcountGap: gap,
                        recommendedHours: weeklyHours,
                    });
                }
            }

            if (roleTargets.size === 0) continue;

            for (const target of roleTargets.values()) {
                let plannedHours = 0;
                for (const entry of entries) {
                    const entryProjectId = entry.project_id?.toString();
                    if (!entryProjectId || entryProjectId !== project.id) continue;
                    const entryWeek = format(new Date(entry.week_start), 'yyyy-MM-dd');
                    if (entryWeek !== weekStart) continue;
                    const empRole = (entry.employee_id as { job_role?: string })?.job_role;
                    if (rolesMatch(empRole, target.roleName)) {
                        plannedHours += entry.planned_hours ?? 0;
                    }
                }
                plannedHours = round1(plannedHours);

                const hoursToPlan = round1(Math.max(0, target.recommendedHours - plannedHours));
                let status: AllocationSuggestionStatus = 'filled';
                if (hoursToPlan <= 0.5 && target.headcountGap <= 0.01) {
                    status = 'filled';
                } else if (plannedHours <= 0.01) {
                    status = 'missing';
                } else {
                    status = 'partial';
                }

                if (status === 'filled') continue;

                const headcountPart =
                    target.headcountGap > 0
                        ? ` · ${round1(target.headcountGap)} headcount gap`
                        : '';
                const skillPart = target.skillName ? ` (${target.skillName})` : '';

                items.push({
                    weekStart,
                    weekLabel,
                    projectId: project.id,
                    projectName: project.name,
                    projectCode: project.code,
                    roleName: target.roleName,
                    skillName: target.skillName,
                    headcountGap: round1(target.headcountGap),
                    recommendedHours: target.recommendedHours,
                    plannedHours,
                    hoursToPlan,
                    status,
                    message: `Plan ${hoursToPlan}h for ${target.roleName}${skillPart} on ${project.name} (target ${target.recommendedHours}h/week, ${plannedHours}h scheduled${headcountPart}).`,
                });
            }
        }

        for (const [key, hours] of employeeWeekHours) {
            if (!key.endsWith(`:${weekStart}`)) continue;
            if (hours <= WEEKLY_CAPACITY) continue;
            items.push({
                weekStart,
                weekLabel,
                projectId: '',
                projectName: 'All projects',
                projectCode: '—',
                roleName: 'Resource capacity',
                headcountGap: 0,
                recommendedHours: WEEKLY_CAPACITY,
                plannedHours: round1(hours),
                hoursToPlan: 0,
                status: 'overload',
                message: `A resource has ${round1(hours)}h planned this week (over ${WEEKLY_CAPACITY}h capacity) — redistribute hours.`,
            });
        }
    }

    const gapItems = items.filter((i) => i.status !== 'overload');
    const projectIds = new Set(gapItems.map((i) => i.projectId).filter(Boolean));
    const weekSet = new Set(gapItems.map((i) => i.weekStart));

    return {
        weekStartFrom: rangeFrom,
        weekStartTo: params.weekStartTo,
        items: items
            .sort((a, b) => {
                const byWeek = a.weekStart.localeCompare(b.weekStart);
                if (byWeek !== 0) return byWeek;
                const byProject = a.projectName.localeCompare(b.projectName);
                if (byProject !== 0) return byProject;
                return b.hoursToPlan - a.hoursToPlan;
            })
            .slice(0, 50),
        summary: {
            roleGaps: gapItems.length,
            projectsAffected: projectIds.size,
            weeksAffected: weekSet.size,
        },
    };
}
