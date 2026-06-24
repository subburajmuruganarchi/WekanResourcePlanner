import { Types } from 'mongoose';
import { Project } from '../../modules/projects/project.model';
import { Employee } from '../../modules/employees/employee.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import {
    getCurrentUtcWeekBounds,
    operationalDashboardProjectFilter,
    type DashboardScopeFilter,
} from '../../modules/dashboard/dashboard-metrics.service';
import { isScopedEmptyFilter } from '../../common/utils/data-scope.util';
import { features } from '../../config/features';
import {
    computeAvailabilityInPeriod,
    type AllocationCapacitySlice,
} from '../../modules/allocations/allocation-availability.util';
import {
    weeklyCapacityEngine,
    WeeklyCapacityEngine,
} from '../weekly-capacity/weekly-capacity.engine';
import { weekStartToIsoDate } from '../../common/utils/week.util';
import { activeEmployeeMongoFilter } from '../../common/utils/employee-status.util';

export type AllocationConflictType =
    | 'over_allocation'
    | 'zero_planned_hours'
    | 'under_planned_hours'
    | 'allocation_percent_exceeded';

export interface AllocationConflict {
    type: AllocationConflictType;
    employeeId: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM';
    plannedHours?: number;
    expectedHours?: number;
    peakCommittedPercent?: number;
}

export interface ProjectCapacityForecast {
    projectId: string;
    projectName: string;
    projectCode: string;
    allocatedMembers: number;
    expectedHours: number;
    plannedHours: number;
    gapHours: number;
    planCoveragePercent: number;
    conflicts: AllocationConflict[];
}

export interface EmployeeCapacityForecast {
    employeeId: string;
    employeeName: string;
    capacityHours: number;
    portfolioCommittedHours: number;
    totalCommittedHours: number;
    availableHours: number;
    utilizationPercent: number;
    availabilityPercent: number;
    isOverAllocated: boolean;
    peakCommittedPercent: number;
}

export interface PortfolioCapacityForecast {
    weekStart: string;
    capacityHoursPerWeek: number;
    employeeCount: number;
    projectCount: number;
    totalCapacityHours: number;
    committedHours: number;
    availableHours: number;
    capacityGapHours: number;
    utilizationPercent: number;
    employees: EmployeeCapacityForecast[];
    projects: ProjectCapacityForecast[];
    conflicts: AllocationConflict[];
    recommendation: string;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function allocationOverlapsWeek(alloc: { start_date: Date; end_date: Date }, weekStart: Date, weekEnd: Date): boolean {
    const aStart = new Date(alloc.start_date);
    const aEnd = new Date(alloc.end_date);
    return aStart <= weekEnd && aEnd >= weekStart;
}

function expectedHoursFromAllocationPercent(percent: number): number {
    return WeeklyCapacityEngine.plannedHoursFromAllocationPercent(percent);
}

function emptyForecast(weekStart: string): PortfolioCapacityForecast {
    const capacity = features.weeklyCapacityHours;
    return {
        weekStart,
        capacityHoursPerWeek: capacity,
        employeeCount: 0,
        projectCount: 0,
        totalCapacityHours: 0,
        committedHours: 0,
        availableHours: 0,
        capacityGapHours: 0,
        utilizationPercent: 0,
        employees: [],
        projects: [],
        conflicts: [],
        recommendation:
            'No projects in scope. Assign delivery portfolio projects to view capacity forecast.',
    };
}

function buildRecommendation(
    capacityGapHours: number,
    conflicts: AllocationConflict[],
    projectCount: number
): string {
    const overAlloc = conflicts.filter((c) => c.type === 'over_allocation').length;
    const zeroPlan = conflicts.filter((c) => c.type === 'zero_planned_hours').length;
    const percentExceeded = conflicts.filter((c) => c.type === 'allocation_percent_exceeded').length;

    if (overAlloc > 0) {
        return `${overAlloc} team member(s) exceed weekly hour capacity. Rebalance planner hours or project allocations.`;
    }
    if (percentExceeded > 0) {
        return `${percentExceeded} team member(s) have concurrent allocation percentages above 100%. Adjust project_allocations date ranges or percentages.`;
    }
    if (capacityGapHours > 0) {
        return `${round2(capacityGapHours)}h of allocated portfolio capacity is not reflected in the current-week planner across ${projectCount} project(s).`;
    }
    if (zeroPlan > 0) {
        return `${zeroPlan} allocated member(s) have no planned hours this week. Update weekly_allocation_entries for the portfolio.`;
    }
    return 'Portfolio capacity is balanced for the current week based on project_allocations and weekly planner hours.';
}

/**
 * Portfolio-scoped capacity forecast for Delivery Manager (and other scoped roles).
 * Sources: project_allocations, weekly_allocation_entries, employee availability.
 */
export async function buildPortfolioCapacityForecast(
    scope?: DashboardScopeFilter
): Promise<PortfolioCapacityForecast> {
    const { weekStart, weekEnd } = getCurrentUtcWeekBounds();
    const weekIso = weekStartToIsoDate(weekStart);
    const capacityPerWeek = features.weeklyCapacityHours;

    if (isScopedEmptyFilter(scope)) {
        return emptyForecast(weekIso);
    }

    const projectQuery: Record<string, unknown> = { ...operationalDashboardProjectFilter() };
    if (scope?.projectIds?.length) {
        projectQuery._id = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const projects = await Project.find(projectQuery)
        .select('_id project_name project_code')
        .lean();

    if (projects.length === 0) {
        return emptyForecast(weekIso);
    }

    const projectIds = projects.map((p) => p._id);
    const projectMeta = new Map(
        projects.map((p) => [p._id.toString(), { name: p.project_name, code: p.project_code }])
    );

    const portfolioAllocations = await ProjectAllocation.find({
        project_id: { $in: projectIds },
        is_active: true,
    }).lean();

    const employeeIdSet = new Set(portfolioAllocations.map((a) => a.employee_id.toString()));
    const employeeIds = [...employeeIdSet];

    if (employeeIds.length === 0) {
        const projectRows: ProjectCapacityForecast[] = projects.map((p) => ({
            projectId: p._id.toString(),
            projectName: p.project_name,
            projectCode: p.project_code,
            allocatedMembers: 0,
            expectedHours: 0,
            plannedHours: 0,
            gapHours: 0,
            planCoveragePercent: 0,
            conflicts: [],
        }));

        return {
            weekStart: weekIso,
            capacityHoursPerWeek: capacityPerWeek,
            employeeCount: 0,
            projectCount: projects.length,
            totalCapacityHours: 0,
            committedHours: 0,
            availableHours: 0,
            capacityGapHours: 0,
            utilizationPercent: 0,
            employees: [],
            projects: projectRows,
            conflicts: [],
            recommendation:
                'Portfolio projects have no active project_allocations. Staff projects before forecasting capacity.',
        };
    }

    const employeeOids = employeeIds.map((id) => new Types.ObjectId(id));

    const [employees, portfolioWeekEntries, allWeekEntries, allActiveAllocations] = await Promise.all([
        Employee.find({ _id: { $in: employeeOids }, ...activeEmployeeMongoFilter() })
            .select('_id first_name last_name')
            .lean(),
        WeeklyAllocationEntry.find({
            project_id: { $in: projectIds },
            week_start: weekStart,
        }).lean(),
        WeeklyAllocationEntry.find({
            employee_id: { $in: employeeOids },
            week_start: weekStart,
        }).lean(),
        ProjectAllocation.find({
            employee_id: { $in: employeeOids },
            is_active: true,
        }).lean(),
    ]);

    const employeeNameById = new Map(
        employees.map((e) => [e._id.toString(), `${e.first_name} ${e.last_name}`.trim()])
    );

    const portfolioPlannedByProject = new Map<string, number>();
    const portfolioPlannedByEmployee = new Map<string, number>();
    for (const entry of portfolioWeekEntries) {
        const pid = entry.project_id.toString();
        const eid = entry.employee_id.toString();
        const hours = entry.planned_hours ?? 0;
        portfolioPlannedByProject.set(pid, (portfolioPlannedByProject.get(pid) ?? 0) + hours);
        portfolioPlannedByEmployee.set(eid, (portfolioPlannedByEmployee.get(eid) ?? 0) + hours);
    }

    const totalPlannedByEmployee = new Map<string, number>();
    const cellsByEmployee = new Map<string, { projectId: string; plannedHours: number; actualHours: number; forecastHours: number }[]>();
    for (const entry of allWeekEntries) {
        const eid = entry.employee_id.toString();
        const hours = entry.planned_hours ?? 0;
        totalPlannedByEmployee.set(eid, (totalPlannedByEmployee.get(eid) ?? 0) + hours);
        const cells = cellsByEmployee.get(eid) ?? [];
        cells.push({
            projectId: entry.project_id.toString(),
            plannedHours: entry.planned_hours ?? 0,
            actualHours: entry.actual_hours ?? 0,
            forecastHours: entry.forecast_hours ?? 0,
        });
        cellsByEmployee.set(eid, cells);
    }

    const expectedByProject = new Map<string, number>();
    const membersByProject = new Map<string, Set<string>>();
    const expectedByEmployeeProject = new Map<string, number>();

    for (const alloc of portfolioAllocations) {
        if (!allocationOverlapsWeek(alloc, weekStart, weekEnd)) continue;

        const pid = alloc.project_id.toString();
        const eid = alloc.employee_id.toString();
        const expected = expectedHoursFromAllocationPercent(alloc.allocation_percent ?? 0);

        expectedByProject.set(pid, (expectedByProject.get(pid) ?? 0) + expected);

        const members = membersByProject.get(pid) ?? new Set<string>();
        members.add(eid);
        membersByProject.set(pid, members);

        const empProjKey = `${eid}:${pid}`;
        expectedByEmployeeProject.set(empProjKey, (expectedByEmployeeProject.get(empProjKey) ?? 0) + expected);
    }

    const conflicts: AllocationConflict[] = [];

    const allocationsByEmployee = new Map<string, AllocationCapacitySlice[]>();
    for (const alloc of allActiveAllocations) {
        const eid = alloc.employee_id.toString();
        const slices = allocationsByEmployee.get(eid) ?? [];
        slices.push({
            start_date: alloc.start_date,
            end_date: alloc.end_date,
            allocation_percent: alloc.allocation_percent ?? 0,
        });
        allocationsByEmployee.set(eid, slices);
    }

    let totalCapacityHours = 0;
    let committedHours = 0;
    let availableHours = 0;

    const employeeRows: EmployeeCapacityForecast[] = [];

    for (const employeeId of employeeIds) {
        const name = employeeNameById.get(employeeId) ?? 'Unknown';
        const portfolioCommitted = portfolioPlannedByEmployee.get(employeeId) ?? 0;
        const totalCommitted = totalPlannedByEmployee.get(employeeId) ?? 0;
        const cells = cellsByEmployee.get(employeeId) ?? [];
        const metrics = weeklyCapacityEngine.computeEmployeeWeek({
            employeeId,
            weekStart: weekIso,
            cells,
        });

        const periodAvailability = computeAvailabilityInPeriod(
            allocationsByEmployee.get(employeeId) ?? [],
            weekStart,
            weekEnd
        );

        if (periodAvailability.peakCommittedPercent > 100) {
            conflicts.push({
                type: 'allocation_percent_exceeded',
                employeeId,
                employeeName: name,
                message: `Concurrent project_allocations peak at ${periodAvailability.peakCommittedPercent}% during the current week.`,
                severity: 'HIGH',
                peakCommittedPercent: periodAvailability.peakCommittedPercent,
            });
        }

        if (metrics.isOverAllocated) {
            conflicts.push({
                type: 'over_allocation',
                employeeId,
                employeeName: name,
                message: `Weekly planned hours (${metrics.committedHours}h) exceed capacity (${capacityPerWeek}h).`,
                severity: 'HIGH',
                plannedHours: metrics.committedHours,
                expectedHours: capacityPerWeek,
            });
        }

        totalCapacityHours += capacityPerWeek;
        committedHours += portfolioCommitted;
        availableHours += metrics.availableHours;

        employeeRows.push({
            employeeId,
            employeeName: name,
            capacityHours: capacityPerWeek,
            portfolioCommittedHours: round2(portfolioCommitted),
            totalCommittedHours: round2(totalCommitted),
            availableHours: metrics.availableHours,
            utilizationPercent: metrics.utilizationPercent,
            availabilityPercent: periodAvailability.minFreePercent,
            isOverAllocated: metrics.isOverAllocated,
            peakCommittedPercent: periodAvailability.peakCommittedPercent,
        });
    }

    let capacityGapHours = 0;
    const projectRows: ProjectCapacityForecast[] = [];

    for (const project of projects) {
        const pid = project._id.toString();
        const meta = projectMeta.get(pid)!;
        const expected = expectedByProject.get(pid) ?? 0;
        const planned = portfolioPlannedByProject.get(pid) ?? 0;
        const gap = Math.max(0, round2(expected - planned));
        capacityGapHours += gap;

        const planCoveragePercent =
            expected > 0 ? Math.min(100, round2((planned / expected) * 100)) : planned > 0 ? 100 : 0;

        const projectConflicts: AllocationConflict[] = [];

        const members = membersByProject.get(pid) ?? new Set<string>();
        for (const eid of members) {
            const empProjKey = `${eid}:${pid}`;
            const expectedEmp = expectedByEmployeeProject.get(empProjKey) ?? 0;
            const plannedEmp =
                portfolioWeekEntries
                    .filter((e) => e.employee_id.toString() === eid && e.project_id.toString() === pid)
                    .reduce((s, e) => s + (e.planned_hours ?? 0), 0) ?? 0;

            if (expectedEmp > 0 && plannedEmp <= 0) {
                const conflict: AllocationConflict = {
                    type: 'zero_planned_hours',
                    employeeId: eid,
                    employeeName: employeeNameById.get(eid),
                    projectId: pid,
                    projectName: meta.name,
                    message: `Allocated on ${meta.name} but no planned hours for the current week.`,
                    severity: 'MEDIUM',
                    plannedHours: 0,
                    expectedHours: round2(expectedEmp),
                };
                projectConflicts.push(conflict);
                conflicts.push(conflict);
            } else if (expectedEmp > 0 && plannedEmp < expectedEmp) {
                const conflict: AllocationConflict = {
                    type: 'under_planned_hours',
                    employeeId: eid,
                    employeeName: employeeNameById.get(eid),
                    projectId: pid,
                    projectName: meta.name,
                    message: `Planned ${round2(plannedEmp)}h vs ${round2(expectedEmp)}h expected from project_allocations on ${meta.name}.`,
                    severity: 'MEDIUM',
                    plannedHours: round2(plannedEmp),
                    expectedHours: round2(expectedEmp),
                };
                projectConflicts.push(conflict);
                conflicts.push(conflict);
            }
        }

        projectRows.push({
            projectId: pid,
            projectName: meta.name,
            projectCode: meta.code,
            allocatedMembers: members.size,
            expectedHours: round2(expected),
            plannedHours: round2(planned),
            gapHours: gap,
            planCoveragePercent,
            conflicts: projectConflicts,
        });
    }

    committedHours = round2(committedHours);
    availableHours = round2(availableHours);
    capacityGapHours = round2(capacityGapHours);
    totalCapacityHours = round2(totalCapacityHours);

    const utilizationPercent =
        totalCapacityHours > 0 ? round2((committedHours / totalCapacityHours) * 100) : 0;

    projectRows.sort((a, b) => b.gapHours - a.gapHours || b.plannedHours - a.plannedHours);
    employeeRows.sort(
        (a, b) => Number(b.isOverAllocated) - Number(a.isOverAllocated) || b.portfolioCommittedHours - a.portfolioCommittedHours
    );

    return {
        weekStart: weekIso,
        capacityHoursPerWeek: capacityPerWeek,
        employeeCount: employeeRows.length,
        projectCount: projectRows.length,
        totalCapacityHours,
        committedHours,
        availableHours,
        capacityGapHours,
        utilizationPercent,
        employees: employeeRows,
        projects: projectRows,
        conflicts,
        recommendation: buildRecommendation(capacityGapHours, conflicts, projectRows.length),
    };
}
