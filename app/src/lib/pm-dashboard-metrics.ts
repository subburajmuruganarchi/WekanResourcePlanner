import type { Project } from '@/types/api';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';
import type { UtilizationVarianceRow } from '@/types/utilization';
import { filterProjectsManagedByEmployee } from '@/lib/project-scope';
import { isActiveProject, projectStatusLabel, projectStatusOf } from '@/lib/project-status';
import type { ProjectStatus } from '@/types/api';

export interface PmStatusBreakdown {
    Active: number;
    Proposal: number;
    OnHold: number;
    Completed: number;
    ProposalLost: number;
}

export interface PmProjectHoursRow {
    projectId: string;
    projectName: string;
    projectCode: string;
    status: string;
    teamSize: number;
    plannedHours: number;
    actualHours: number;
    deltaHours: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PmDashboardSnapshot {
    orgActiveProjects: number;
    myProjects: Project[];
    myProjectCount: number;
    statusBreakdown: PmStatusBreakdown;
    uniqueTeamMembers: number;
    allocationSlots: number;
    atRiskCount: number;
    highRiskCount: number;
    plannedHoursWeek: number;
    actualHoursWeek: number;
    deltaHoursWeek: number;
    allProjectsListSamePm: boolean;
}

const STATUS_KEYS: (keyof PmStatusBreakdown)[] = [
    'Active',
    'Proposal',
    'OnHold',
    'Completed',
    'ProposalLost',
];

export function buildPmStatusBreakdown(projects: Project[]): PmStatusBreakdown {
    const counts: PmStatusBreakdown = {
        Active: 0,
        Proposal: 0,
        OnHold: 0,
        Completed: 0,
        ProposalLost: 0,
    };

    for (const project of projects) {
        const status = projectStatusOf(project);
        if (status in counts) {
            counts[status as keyof PmStatusBreakdown] += 1;
        }
    }

    return counts;
}

export function statusBreakdownChartData(breakdown: PmStatusBreakdown) {
    return STATUS_KEYS.filter((key) => breakdown[key] > 0).map((key) => ({
        name: projectStatusLabel(key as ProjectStatus),
        value: breakdown[key],
        key,
    }));
}

export function buildPmDashboardSnapshot(
    allProjects: Project[],
    employeeId: string | undefined,
    uniqueTeamMembers: number,
    risks: DeliveryRiskItem[],
    varianceRows: UtilizationVarianceRow[]
): PmDashboardSnapshot {
    const myProjects = filterProjectsManagedByEmployee(allProjects, employeeId);
    const myProjectIds = new Set(myProjects.map((p) => p.id));

    const scopedVariance = varianceRows.filter((r) => myProjectIds.has(r.projectId));
    let plannedHoursWeek = 0;
    let actualHoursWeek = 0;
    for (const row of scopedVariance) {
        plannedHoursWeek += row.plannedHours;
        actualHoursWeek += row.actualHours;
    }

    const scopedRisks = risks.filter((r) => myProjectIds.has(r.projectId));
    const atRiskCount = scopedRisks.filter(
        (r) => r.level === 'MEDIUM' || r.level === 'HIGH'
    ).length;
    const highRiskCount = scopedRisks.filter((r) => r.level === 'HIGH').length;

    const allocationSlots = myProjects.reduce((sum, p) => sum + (p.teamSize ?? 0), 0);

    return {
        orgActiveProjects: allProjects.length,
        myProjects,
        myProjectCount: myProjects.length,
        statusBreakdown: buildPmStatusBreakdown(myProjects),
        uniqueTeamMembers,
        allocationSlots,
        atRiskCount,
        highRiskCount,
        plannedHoursWeek,
        actualHoursWeek,
        deltaHoursWeek: actualHoursWeek - plannedHoursWeek,
        allProjectsListSamePm:
            allProjects.length > 0 && myProjects.length === allProjects.length,
    };
}

export function buildPmProjectHoursRows(
    myProjects: Project[],
    varianceRows: UtilizationVarianceRow[],
    risks: DeliveryRiskItem[]
): PmProjectHoursRow[] {
    const myProjectIds = new Set(myProjects.map((p) => p.id));
    const hoursByProject = new Map<string, { planned: number; actual: number }>();

    for (const row of varianceRows) {
        if (!myProjectIds.has(row.projectId)) continue;
        const cur = hoursByProject.get(row.projectId) ?? { planned: 0, actual: 0 };
        cur.planned += row.plannedHours;
        cur.actual += row.actualHours;
        hoursByProject.set(row.projectId, cur);
    }

    return myProjects
        .map((project) => {
            const hours = hoursByProject.get(project.id) ?? { planned: 0, actual: 0 };
            const risk = risks.find((r) => r.projectId === project.id);
            return {
                projectId: project.id,
                projectName: project.name,
                projectCode: project.code,
                status: projectStatusLabel(projectStatusOf(project)),
                teamSize: project.teamSize ?? 0,
                plannedHours: hours.planned,
                actualHours: hours.actual,
                deltaHours: hours.actual - hours.planned,
                riskLevel: risk?.level,
            };
        })
        .sort((a, b) => b.plannedHours - a.plannedHours);
}

export function countMyActiveProjects(projects: Project[]): number {
    return projects.filter((p) => isActiveProject(p)).length;
}
