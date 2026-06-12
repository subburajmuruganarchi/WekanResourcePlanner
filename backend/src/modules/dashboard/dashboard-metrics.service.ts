import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { TimeEntry } from '../time-entries/time-entry.model';
import { TimeEntryStatus } from '../../common/types/enums';
import { WeeklyAllocationEntry } from '../weekly-allocations/weekly-allocation-entry.model';
import { features } from '../../config/features';
import { computePeakCommittedPercent } from '../allocations/allocation-availability.util';
import type { DashboardPeriodRange } from './dashboard-period.util';

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

async function computeAvgUtilizationForPeriod(period: DashboardPeriodRange): Promise<number> {
    const weeklyEntries = await WeeklyAllocationEntry.find({
        week_start: { $gte: period.weekStartFrom, $lte: period.weekStartTo },
    }).lean();

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

    const allocations = await ProjectAllocation.find({
        is_active: true,
        start_date: { $lte: period.periodEnd },
        end_date: { $gte: period.periodStart },
    }).lean();

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

/** Single source of truth for dashboard stat cards and AI insight metrics. */
export async function collectDashboardMetrics(period: DashboardPeriodRange): Promise<DashboardMetrics> {
    const activeProjects = await Project.countDocuments({ status: 'Active' });

    const totalEmployees = await Employee.countDocuments({
        $or: [{ is_active: true }, { status: 'Active' }],
    });

    const avgUtilization = await computeAvgUtilizationForPeriod(period);

    const weeklyEntries = await WeeklyAllocationEntry.find({
        week_start: { $gte: period.weekStartFrom, $lte: period.weekStartTo },
    }).lean();

    const plannedHours = Math.round(
        weeklyEntries.reduce((sum, e) => sum + (e.planned_hours ?? 0), 0) * 10
    ) / 10;

    const allocationActualHours = Math.round(
        weeklyEntries.reduce((sum, e) => sum + (e.actual_hours ?? 0), 0) * 10
    ) / 10;

    const timeEntryFilter = {
        date: { $gte: period.periodStart, $lte: period.periodEnd },
    };

    const periodTimeEntries = await TimeEntry.find(timeEntryFilter);
    const hoursThisWeek = Math.round(
        periodTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0) * 10
    ) / 10;

    /** Open queue — not period-scoped so PMs always see actionable items. */
    const pendingApprovals = await TimeEntry.countDocuments({
        status: TimeEntryStatus.SUBMITTED,
    });

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
