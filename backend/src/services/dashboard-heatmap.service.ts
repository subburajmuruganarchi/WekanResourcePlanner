import { ProjectAllocation } from '../modules/allocations/allocation.model';
import { Project } from '../modules/projects/project.model';

export interface HeatmapCell {
    employeeId: string;
    projectId: string;
    percent: number;
}

export interface AllocationHeatmapData {
    projects: { id: string; name: string; code: string }[];
    employees: { id: string; name: string; totalPercent: number }[];
    cells: HeatmapCell[];
}

const MAX_EMPLOYEES = 14;
const MAX_PROJECTS = 10;

/** Read-only snapshot for dashboard heatmap (active allocations). */
export async function buildAllocationHeatmap(): Promise<AllocationHeatmapData> {
    const allocations = await ProjectAllocation.find({ is_active: true })
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
    const employeeTotals = new Map<string, { id: string; name: string; totalPercent: number }>();
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

        const et = employeeTotals.get(employeeId) ?? { id: employeeId, name: empName, totalPercent: 0 };
        et.totalPercent += pct;
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

    const employees = [...employeeTotals.values()]
        .sort((a, b) => b.totalPercent - a.totalPercent)
        .slice(0, MAX_EMPLOYEES);

    const employeeIds = new Set(employees.map((e) => e.id));

    const projects = [...projectTotals.values()]
        .sort((a, b) => b.headcount - a.headcount)
        .slice(0, MAX_PROJECTS);

    const projectIds = new Set(projects.map((p) => p.id));

    const filteredCells = cells.filter(
        (c) => employeeIds.has(c.employeeId) && projectIds.has(c.projectId)
    );

    return {
        projects: projects.map(({ id, name, code }) => ({ id, name, code })),
        employees,
        cells: filteredCells,
    };
}

/** Top active projects by staffing risk score (read-only). */
export async function buildStaffingRiskSummary(limit = 6) {
    const { assessStaffingRisk } = await import('./ai/staffing-risk.service');
    const active = await Project.find({ status: 'Active' }).select('_id project_name project_code').limit(30).lean();

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
                    reasons: risk.reasons.slice(0, 2),
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
