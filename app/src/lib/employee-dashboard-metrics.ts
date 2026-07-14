import type { Employee, Project } from '@/types/api';
import type { UtilizationVarianceRow } from '@/types/utilization';
import { isActiveProject, projectStatusLabel, projectStatusOf } from '@/lib/project-status';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';

export interface EmployeeWeekSnapshot {
    plannedHours: number;
    actualHours: number;
    deltaHours: number;
    utilizationPercent: number | null;
}

export interface EmployeeProjectRow {
    projectId: string;
    projectName: string;
    projectCode: string;
    status: string;
    isActive: boolean;
    managerName: string;
    allocationPercent: number | null;
    plannedHours: number;
    actualHours: number;
    deltaHours: number;
}

type PlannerHoursByProject = Map<string, { planned: number; actual: number }>;

export function buildEmployeeWeekSnapshot(
    varianceRows: UtilizationVarianceRow[],
    plannerByProject?: PlannerHoursByProject,
    /** Fallback when variance + planner have no planned hours (legacy % allocations). */
    projectsFallback?: { projects: Project[]; employeeId?: string }
): EmployeeWeekSnapshot {
    let plannedHours = 0;
    let actualHours = 0;
    for (const row of varianceRows) {
        plannedHours += row.plannedHours;
        actualHours += row.actualHours;
    }

    if (plannerByProject && plannerByProject.size > 0) {
        let fromPlannerPlanned = 0;
        let fromPlannerActual = 0;
        for (const hours of plannerByProject.values()) {
            fromPlannerPlanned += hours.planned;
            fromPlannerActual += hours.actual;
        }
        if (fromPlannerPlanned > 0 || plannedHours === 0) {
            plannedHours = fromPlannerPlanned;
        }
        if (fromPlannerActual > 0 || actualHours === 0) {
            actualHours = fromPlannerActual;
        }
    }

    if (plannedHours === 0 && projectsFallback?.employeeId) {
        plannedHours = plannedHoursFromAllocationPercent(
            projectsFallback.projects,
            projectsFallback.employeeId
        );
    }

    const utilizationPercent =
        plannedHours > 0 ? Math.min(100, Math.round((actualHours / plannedHours) * 100)) : null;

    return {
        plannedHours,
        actualHours,
        deltaHours: actualHours - plannedHours,
        utilizationPercent,
    };
}

function plannedHoursFromAllocationPercent(projects: Project[], employeeId: string): number {
    let total = 0;
    for (const project of projects) {
        const pct = myAllocationOnProject(project, employeeId);
        if (pct == null || pct <= 0) continue;
        total += (pct / 100) * DEFAULT_WEEKLY_CAPACITY_HOURS;
    }
    return Math.round(total * 100) / 100;
}

export function myAllocationOnProject(project: Project, employeeId?: string): number | null {
    if (!employeeId) return null;
    const member = project.teamMembers?.find((m) => m.employeeId === employeeId);
    return member?.allocationPercent ?? null;
}

export function sortEmployeeProjects(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => {
        const aRank = isActiveProject(a) ? 0 : 1;
        const bRank = isActiveProject(b) ? 0 : 1;
        return aRank - bRank || a.name.localeCompare(b.name);
    });
}

export function buildEmployeeProjectRows(
    projects: Project[],
    employeeId: string | undefined,
    varianceRows: UtilizationVarianceRow[],
    plannerByProject?: PlannerHoursByProject
): EmployeeProjectRow[] {
    const hoursByProject = new Map<string, { planned: number; actual: number }>();
    for (const row of varianceRows) {
        const cur = hoursByProject.get(row.projectId) ?? { planned: 0, actual: 0 };
        cur.planned += row.plannedHours;
        cur.actual += row.actualHours;
        hoursByProject.set(row.projectId, cur);
    }

    if (plannerByProject) {
        for (const [projectId, hours] of plannerByProject) {
            const cur = hoursByProject.get(projectId) ?? { planned: 0, actual: 0 };
            if (hours.planned > 0 || cur.planned === 0) cur.planned = hours.planned;
            if (hours.actual > 0 || cur.actual === 0) cur.actual = hours.actual;
            hoursByProject.set(projectId, cur);
        }
    }

    return sortEmployeeProjects(projects).map((project) => {
        const hours = hoursByProject.get(project.id) ?? { planned: 0, actual: 0 };
        const allocationPercent = myAllocationOnProject(project, employeeId);
        let planned = hours.planned;
        if (planned === 0 && allocationPercent != null && allocationPercent > 0) {
            planned = Math.round((allocationPercent / 100) * DEFAULT_WEEKLY_CAPACITY_HOURS * 100) / 100;
        }
        return {
            projectId: project.id,
            projectName: project.name,
            projectCode: project.code,
            status: projectStatusLabel(projectStatusOf(project)),
            isActive: isActiveProject(project),
            managerName: project.managerName || '—',
            allocationPercent,
            plannedHours: planned,
            actualHours: hours.actual,
            deltaHours: hours.actual - planned,
        };
    });
}

export function countActiveProjects(projects: Project[]): number {
    return projects.filter((p) => isActiveProject(p)).length;
}

export function allocatedPercent(employee: Employee | null): number | null {
    if (!employee) return null;
    if (typeof employee.availability !== 'number') return null;
    return Math.max(0, Math.min(100, 100 - employee.availability));
}

export function topSkills(employee: Employee | null, limit = 6): string[] {
    if (!employee?.skills?.length) return [];
    const sorted = [...employee.skills].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, limit).map((s) => s.name);
}
