import { format, parseISO } from 'date-fns';
import { Project } from '../../modules/projects/project.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { features } from '../../config/features';

const WEEKLY_CAPACITY = features.weeklyCapacityHours ?? 40;

export interface AllocationSuggestion {
    weekStart: string;
    weekLabel: string;
    type: 'SHORTAGE' | 'OVERLOAD' | 'REDISTRIBUTE';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    projectId?: string;
    projectName?: string;
}

export async function buildAllocationSuggestions(params: {
    weekStartFrom: string;
    weekStartTo: string;
    projectId?: string;
}): Promise<AllocationSuggestion[]> {
    const projectFilter: Record<string, unknown> = { status: 'Active' };
    if (params.projectId) {
        projectFilter._id = params.projectId;
    }

    const projects = await Project.find(projectFilter)
        .select('_id project_name project_code')
        .lean();

    const entries = await WeeklyAllocationEntry.find({
        week_start: { $gte: params.weekStartFrom, $lte: params.weekStartTo },
        ...(params.projectId ? { project_id: params.projectId } : {}),
    })
        .populate<{ employee_id: { job_role?: string; first_name?: string; last_name?: string } }>(
            'employee_id',
            'job_role first_name last_name'
        )
        .lean();

    const suggestions: AllocationSuggestion[] = [];
    const weeks = new Set<string>();
    for (const e of entries) {
        weeks.add(format(new Date(e.week_start), 'yyyy-MM-dd'));
    }

    const weekList = [...weeks].sort();
    if (weekList.length === 0) {
        return [
            {
                weekStart: params.weekStartFrom,
                weekLabel: format(parseISO(params.weekStartFrom), 'MMM d'),
                type: 'SHORTAGE',
                severity: 'info',
                message: 'No weekly allocation data in this range — add rows in Resource Allocation.',
            },
        ];
    }

    // Employee overload by week
    const employeeWeekHours = new Map<string, number>();
    for (const entry of entries) {
        const emp = entry.employee_id as { _id?: { toString: () => string } };
        if (!emp?._id) continue;
        const week = format(new Date(entry.week_start), 'yyyy-MM-dd');
        const key = `${emp._id.toString()}:${week}`;
        employeeWeekHours.set(key, (employeeWeekHours.get(key) ?? 0) + (entry.planned_hours ?? 0));
    }

    for (const [key, hours] of employeeWeekHours) {
        if (hours <= WEEKLY_CAPACITY) continue;
        const [, week] = key.split(':');
        suggestions.push({
            weekStart: week,
            weekLabel: format(parseISO(week), 'MMM d'),
            type: 'OVERLOAD',
            severity: 'critical',
            message: `Resource over ${WEEKLY_CAPACITY}h/week (${Math.round(hours)}h planned) — suggest redistribution.`,
        });
    }

    // Project role gaps (simplified — compare weekly hours vs rough need)
    for (const week of weekList) {
        for (const project of projects) {
            const projectId = project._id.toString();
            const weekEntries = entries.filter(
                (e) =>
                    e.project_id?.toString() === projectId &&
                    format(new Date(e.week_start), 'yyyy-MM-dd') === week
            );
            const totalHours = weekEntries.reduce((s, e) => s + (e.planned_hours ?? 0), 0);
            if (weekEntries.length === 0 && projects.length <= 20) {
                suggestions.push({
                    weekStart: week,
                    weekLabel: format(parseISO(week), 'MMM d'),
                    type: 'SHORTAGE',
                    severity: 'warning',
                    projectId,
                    projectName: project.project_name,
                    message: `${project.project_name}: no resources planned for this week.`,
                });
            } else if (totalHours > WEEKLY_CAPACITY * 3) {
                suggestions.push({
                    weekStart: week,
                    weekLabel: format(parseISO(week), 'MMM d'),
                    type: 'REDISTRIBUTE',
                    severity: 'warning',
                    projectId,
                    projectName: project.project_name,
                    message: `${project.project_name}: ${Math.round(totalHours)}h planned — review for frontend/backend balance.`,
                });
            }
        }
    }

    // Role bucket hints from employee job roles
    const roleGapsByWeek = new Map<string, Map<string, number>>();
    for (const entry of entries) {
        const emp = entry.employee_id as { job_role?: string };
        const week = format(new Date(entry.week_start), 'yyyy-MM-dd');
        const role = emp?.job_role || 'General';
        if (!roleGapsByWeek.has(week)) roleGapsByWeek.set(week, new Map());
        const m = roleGapsByWeek.get(week)!;
        m.set(role, (m.get(role) ?? 0) + (entry.planned_hours ?? 0));
    }

    return suggestions
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .slice(0, 30);
}
