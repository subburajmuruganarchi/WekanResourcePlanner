import { ProjectAllocation } from '../modules/allocations/allocation.model';
import { Project } from '../modules/projects/project.model';
import { WeeklyAllocationEntry } from '../modules/weekly-allocations/weekly-allocation-entry.model';
import { computePeakCommittedPercent } from '../modules/allocations/allocation-availability.util';
import type { DashboardPeriodRange } from '../modules/dashboard/dashboard-period.util';
import { activeDashboardProjectFilter } from '../modules/dashboard/dashboard-metrics.service';
import { features } from '../config/features';

const WEEKLY_CAPACITY = features.weeklyCapacityHours ?? 40;

export interface HeatmapCell {
    employeeId: string;
    projectId: string;
    percent: number;
}

export interface AllocationHeatmapData {
    projects: { id: string; name: string; code: string }[];
    employees: { id: string; name: string; totalPercent: number }[];
    cells: HeatmapCell[];
    meta: {
        totalEmployees: number;
        totalProjects: number;
        truncated: boolean;
        employeeLimit: number;
        projectLimit: number;
    };
}

const DEFAULT_EMPLOYEE_LIMIT = 50;
const DEFAULT_PROJECT_LIMIT = 25;

type ProjectMeta = { id: string; name: string; code: string };

function emptyHeatmap(): AllocationHeatmapData {
    return {
        projects: [],
        employees: [],
        cells: [],
        meta: {
            totalEmployees: 0,
            totalProjects: 0,
            truncated: false,
            employeeLimit: DEFAULT_EMPLOYEE_LIMIT,
            projectLimit: DEFAULT_PROJECT_LIMIT,
        },
    };
}

function applyHeatmapLimits(
    allEmployees: { id: string; name: string; totalPercent: number }[],
    allProjects: ProjectMeta[],
    allCells: HeatmapCell[]
): AllocationHeatmapData {
    const employeeLimit = DEFAULT_EMPLOYEE_LIMIT;
    const projectLimit = DEFAULT_PROJECT_LIMIT;
    const totalEmployees = allEmployees.length;
    const totalProjects = allProjects.length;

    const employees = allEmployees.slice(0, employeeLimit);
    const employeeIds = new Set(employees.map((e) => e.id));
    const employeeCells = allCells.filter((c) => employeeIds.has(c.employeeId));

    const projectWeight = new Map<string, number>();
    for (const c of employeeCells) {
        projectWeight.set(c.projectId, (projectWeight.get(c.projectId) ?? 0) + c.percent);
    }

    const projectOrder = [...projectWeight.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

    const projectMetaById = new Map(allProjects.map((p) => [p.id, p]));
    const projects = projectOrder
        .slice(0, projectLimit)
        .map((id) => projectMetaById.get(id) ?? { id, name: 'Project', code: '' });

    const projectIds = new Set(projects.map((p) => p.id));
    const filteredCells = employeeCells.filter((c) => projectIds.has(c.projectId));

    return {
        projects,
        employees,
        cells: filteredCells,
        meta: {
            totalEmployees,
            totalProjects,
            truncated: totalEmployees > employeeLimit || totalProjects > projectLimit,
            employeeLimit,
            projectLimit,
        },
    };
}

function hoursToPercent(hours: number, weeks: number): number {
    return Math.min(100, Math.round((hours / (WEEKLY_CAPACITY * weeks)) * 100));
}

/** Period-scoped heatmap from weekly planner rows (matches dashboard week filter). */
async function buildAllocationHeatmapFromWeekly(
    period: DashboardPeriodRange
): Promise<AllocationHeatmapData> {
    const entries = await WeeklyAllocationEntry.find({
        week_start: { $gte: period.weekStartFrom, $lte: period.weekStartTo },
        planned_hours: { $gt: 0 },
    })
        .populate<{ project_id: { _id: unknown; project_name: string; project_code: string } }>(
            'project_id',
            'project_name project_code'
        )
        .populate<{ employee_id: { _id: unknown; first_name: string; last_name: string } }>(
            'employee_id',
            'first_name last_name'
        )
        .lean();

    if (entries.length === 0) {
        return emptyHeatmap();
    }

    type CellAgg = {
        employeeId: string;
        projectId: string;
        empName: string;
        projName: string;
        projCode: string;
        totalHours: number;
        weekCount: number;
    };

    const cellAgg = new Map<string, CellAgg>();

    for (const entry of entries) {
        const emp = entry.employee_id as {
            _id?: { toString: () => string };
            first_name?: string;
            last_name?: string;
        };
        const proj = entry.project_id as {
            _id?: { toString: () => string };
            project_name?: string;
            project_code?: string;
        };
        if (!emp?._id || !proj?._id) continue;

        const employeeId = emp._id.toString();
        const projectId = proj._id.toString();
        const key = `${employeeId}:${projectId}`;
        const cur = cellAgg.get(key) ?? {
            employeeId,
            projectId,
            empName: `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim(),
            projName: proj.project_name || 'Project',
            projCode: proj.project_code || '',
            totalHours: 0,
            weekCount: 0,
        };
        cur.totalHours += entry.planned_hours ?? 0;
        cur.weekCount += 1;
        cellAgg.set(key, cur);
    }

    const cells: HeatmapCell[] = [...cellAgg.values()].map((c) => ({
        employeeId: c.employeeId,
        projectId: c.projectId,
        percent: hoursToPercent(c.totalHours, c.weekCount || 1),
    }));

    const employeeTotals = new Map<string, { id: string; name: string; totalPercent: number }>();
    const projectMeta = new Map<string, ProjectMeta>();

    for (const c of cellAgg.values()) {
        const pct = hoursToPercent(c.totalHours, c.weekCount || 1);
        const et = employeeTotals.get(c.employeeId) ?? {
            id: c.employeeId,
            name: c.empName,
            totalPercent: 0,
        };
        et.totalPercent = Math.max(et.totalPercent, pct);
        employeeTotals.set(c.employeeId, et);
        projectMeta.set(c.projectId, { id: c.projectId, name: c.projName, code: c.projCode });
    }

    const allEmployees = [...employeeTotals.values()].sort((a, b) => b.totalPercent - a.totalPercent);
    const allProjects = [...projectMeta.values()];

    return applyHeatmapLimits(allEmployees, allProjects, cells);
}

/** Read-only snapshot for dashboard heatmap (active allocations in period). */
export async function buildAllocationHeatmap(
    period?: DashboardPeriodRange
): Promise<AllocationHeatmapData> {
    if (period) {
        const weekly = await buildAllocationHeatmapFromWeekly(period);
        if (weekly.employees.length > 0) {
            return weekly;
        }
    }

    return buildAllocationHeatmapFromLegacyAllocations(period);
}

async function buildAllocationHeatmapFromLegacyAllocations(
    period?: DashboardPeriodRange
): Promise<AllocationHeatmapData> {
    const allocationFilter: Record<string, unknown> = { is_active: true };
    if (period) {
        allocationFilter.start_date = { $lte: period.periodEnd };
        allocationFilter.end_date = { $gte: period.periodStart };
    }

    const allocations = await ProjectAllocation.find(allocationFilter)
        .populate<{ project_id: { _id: unknown; project_name: string; project_code: string } }>(
            'project_id',
            'project_name project_code'
        )
        .populate<{ employee_id: { _id: unknown; first_name: string; last_name: string } }>(
            'employee_id',
            'first_name last_name'
        )
        .lean();

    const projectTotals = new Map<string, { id: string; name: string; code: string; headcount: number }>();
    const employeeTotals = new Map<
        string,
        { id: string; name: string; totalPercent: number; slices: { start_date: Date; end_date: Date; allocation_percent: number }[] }
    >();
    const cells: HeatmapCell[] = [];

    for (const alloc of allocations) {
        const emp = alloc.employee_id as { _id?: { toString: () => string }; first_name?: string; last_name?: string };
        const proj = alloc.project_id as { _id?: { toString: () => string }; project_name?: string; project_code?: string };
        if (!emp?._id || !proj?._id) continue;

        const employeeId = emp._id.toString();
        const projectId = proj._id.toString();
        const pct = alloc.allocation_percent || 0;
        const empName = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim();

        cells.push({ employeeId, projectId, percent: pct });

        const et = employeeTotals.get(employeeId) ?? {
            id: employeeId,
            name: empName,
            totalPercent: 0,
            slices: [],
        };
        et.slices.push({
            start_date: new Date(alloc.start_date),
            end_date: new Date(alloc.end_date),
            allocation_percent: pct,
        });
        employeeTotals.set(employeeId, et);

        const pt = projectTotals.get(projectId) ?? {
            id: projectId,
            name: proj.project_name || 'Project',
            code: proj.project_code || '',
            headcount: 0,
        };
        pt.headcount += 1;
        projectTotals.set(projectId, pt);
    }

    const allEmployees = [...employeeTotals.values()]
        .map((e) => ({
            id: e.id,
            name: e.name,
            totalPercent: computePeakCommittedPercent(e.slices),
        }))
        .sort((a, b) => b.totalPercent - a.totalPercent);

    const allProjects = [...projectTotals.values()].map(({ id, name, code }) => ({ id, name, code }));

    return applyHeatmapLimits(allEmployees, allProjects, cells);
}

/** Top active projects by staffing risk score (read-only). */
export async function buildStaffingRiskSummary(limit = 6) {
    const { assessStaffingRisk } = await import('./ai/staffing-risk.service');
    const active = await Project.find(activeDashboardProjectFilter())
        .select('_id project_name project_code')
        .lean();

    const assessed = await Promise.all(
        active.map(async (p) => {
            try {
                const risk = await assessStaffingRisk(p._id.toString());
                return {
                    projectId: risk.projectId,
                    name: p.project_name,
                    code: p.project_code,
                    level: risk.level,
                    score: risk.score,
                    reasons: risk.reasons.slice(0, 3),
                    requiredSkills: risk.requiredSkills,
                    requiredRoles: risk.requiredRoles,
                    suggestedRoles: risk.suggestedRoles,
                    unfulfilledHeadcount: risk.unfulfilledHeadcount,
                };
            } catch {
                return null;
            }
        })
    );

    return assessed
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
