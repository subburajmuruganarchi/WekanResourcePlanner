import { Types } from 'mongoose';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { TimeEntry } from '../time-entries/time-entry.model';
import { TimeEntryStatus } from '../../common/types/enums';
import { activeProjectMongoFilter, operationalProjectMongoFilter } from '../../common/utils/project-status.util';
import { activeEmployeeMongoFilter } from '../../common/utils/employee-status.util';
import { WeeklyAllocationEntry } from '../weekly-allocations/weekly-allocation-entry.model';
import { features } from '../../config/features';
import { computePeakCommittedPercent } from '../allocations/allocation-availability.util';
import type { DashboardPeriodRange } from './dashboard-period.util';
import { isScopedEmptyFilter } from '../../common/utils/data-scope.util';

export interface DashboardScopeFilter {
    projectIds?: string[];
}

export interface DashboardMetrics {
    activeProjects: number;
    totalEmployees: number;
    avgUtilization: number;
    plannedHours: number;
    hoursThisWeek: number;
    approvedHours: number;
    planDeliveryPercent: number;
    pendingApprovals: number;
    rejectedHours: number;
    periodLabel?: string;
}

/** Strictly Active projects for dashboard KPI counts. */
export function activeDashboardProjectFilter(): Record<string, unknown> {
    return activeProjectMongoFilter();
}

/** Active + Planning — used for delivery risk and heatmap scope. */
export function operationalDashboardProjectFilter(): Record<string, unknown> {
    return operationalProjectMongoFilter();
}

/** UTC Monday 00:00 through Sunday 23:59:59.999 for current week. */
export function getCurrentUtcWeekBounds(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setUTCDate(diff);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
}

async function computeAvgUtilizationForPeriod(
    period: DashboardPeriodRange,
    scope?: DashboardScopeFilter
): Promise<number> {
    const weeklyQuery: Record<string, unknown> = {
        week_start: { $gte: period.weekStartFrom, $lte: period.weekStartTo },
    };
    if (scope?.projectIds?.length) {
        weeklyQuery.project_id = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const weeklyEntries = await WeeklyAllocationEntry.find(weeklyQuery).lean();

    if (weeklyEntries.length > 0) {
        const byEmpWeek = new Map<string, number>();
        for (const e of weeklyEntries) {
            const key = `${e.employee_id.toString()}|${e.week_start.toISOString()}`;
            byEmpWeek.set(key, (byEmpWeek.get(key) ?? 0) + (e.planned_hours ?? 0));
        }
        const capacity = features.weeklyCapacityHours;
        let sum = 0;
        for (const hours of byEmpWeek.values()) {
            sum += Math.min(100, Math.round((hours / capacity) * 100));
        }
        return byEmpWeek.size > 0 ? Math.round(sum / byEmpWeek.size) : 0;
    }

    const allocationQuery: Record<string, unknown> = {
        is_active: true,
        start_date: { $lte: period.periodEnd },
        end_date: { $gte: period.periodStart },
    };
    if (scope?.projectIds?.length) {
        allocationQuery.project_id = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const allocations = await ProjectAllocation.find(allocationQuery).lean();

    const byEmployee = new Map<string, { start_date: Date; end_date: Date; allocation_percent: number }[]>();
    for (const a of allocations) {
        const id = a.employee_id.toString();
        const slices = byEmployee.get(id) ?? [];
        slices.push({
            start_date: new Date(a.start_date),
            end_date: new Date(a.end_date),
            allocation_percent: a.allocation_percent ?? 0,
        });
        byEmployee.set(id, slices);
    }

    if (byEmployee.size === 0) return 0;

    let sum = 0;
    for (const slices of byEmployee.values()) {
        sum += computePeakCommittedPercent(slices);
    }
    return Math.round(sum / byEmployee.size);
}

function emptyDashboardMetrics(period: DashboardPeriodRange): DashboardMetrics {
    return {
        activeProjects: 0,
        totalEmployees: 0,
        avgUtilization: 0,
        plannedHours: 0,
        hoursThisWeek: 0,
        approvedHours: 0,
        planDeliveryPercent: 0,
        pendingApprovals: 0,
        rejectedHours: 0,
        periodLabel:
            period.weekStartFromIso === period.weekStartToIso
                ? period.weekStartFromIso
                : `${period.weekStartFromIso} – ${period.weekStartToIso}`,
    };
}

/** Single source of truth for dashboard stat cards and AI insight metrics. */
export async function collectDashboardMetrics(
    period: DashboardPeriodRange,
    scope?: DashboardScopeFilter
): Promise<DashboardMetrics> {
    if (isScopedEmptyFilter(scope)) {
        return emptyDashboardMetrics(period);
    }

    const projectFilter = scope?.projectIds?.length
        ? {
              ...activeDashboardProjectFilter(),
              _id: { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) },
          }
        : activeDashboardProjectFilter();

    const activeProjects = await Project.countDocuments(projectFilter);

    let totalEmployees: number;
    if (scope?.projectIds?.length) {
        const employeeIds = await ProjectAllocation.distinct('employee_id', {
            project_id: { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) },
            is_active: true,
        });
        totalEmployees = employeeIds.length;
    } else {
        totalEmployees = await Employee.countDocuments(activeEmployeeMongoFilter());
    }

    const avgUtilization = await computeAvgUtilizationForPeriod(period, scope);

    const weeklyQuery: Record<string, unknown> = {
        week_start: { $gte: period.weekStartFrom, $lte: period.weekStartTo },
    };
    if (scope?.projectIds?.length) {
        weeklyQuery.project_id = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const weeklyEntries = await WeeklyAllocationEntry.find(weeklyQuery).lean();

    const plannedHours = Math.round(
        weeklyEntries.reduce((sum, e) => sum + (e.planned_hours ?? 0), 0) * 10
    ) / 10;

    const allocationActualHours = Math.round(
        weeklyEntries.reduce((sum, e) => sum + (e.actual_hours ?? 0), 0) * 10
    ) / 10;

    const timeEntryFilter: Record<string, unknown> = {
        date: { $gte: period.periodStart, $lte: period.periodEnd },
    };
    if (scope?.projectIds?.length) {
        timeEntryFilter.projectId = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const periodTimeEntries = await TimeEntry.find(timeEntryFilter);
    const hoursThisWeek = Math.round(
        periodTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0) * 10
    ) / 10;

    const pendingFilter: Record<string, unknown> = {
        status: TimeEntryStatus.SUBMITTED,
    };
    if (scope?.projectIds?.length) {
        pendingFilter.projectId = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }

    const pendingApprovals = await TimeEntry.countDocuments(pendingFilter);

    const approvedEntries = await TimeEntry.find({
        ...timeEntryFilter,
        status: TimeEntryStatus.PM_APPROVED,
    });
    const approvedHours = Math.round(
        approvedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0) * 10
    ) / 10;

    const actualHours =
        approvedHours > 0 ? approvedHours : allocationActualHours > 0 ? allocationActualHours : hoursThisWeek;

    const planDeliveryPercent =
        plannedHours > 0
            ? Math.min(999, Math.round((actualHours / plannedHours) * 1000) / 10)
            : actualHours > 0
              ? 100
              : 0;

    const rejectedEntries = await TimeEntry.find({
        ...timeEntryFilter,
        status: TimeEntryStatus.PM_REJECTED,
    });
    const rejectedHours = rejectedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    return {
        activeProjects,
        totalEmployees,
        avgUtilization,
        plannedHours,
        hoursThisWeek,
        approvedHours: actualHours,
        planDeliveryPercent,
        pendingApprovals,
        rejectedHours,
        periodLabel:
            period.weekStartFromIso === period.weekStartToIso
                ? period.weekStartFromIso
                : `${period.weekStartFromIso} – ${period.weekStartToIso}`,
    };
}
