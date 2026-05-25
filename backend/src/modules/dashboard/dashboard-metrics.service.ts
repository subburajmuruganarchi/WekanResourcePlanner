import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { TimeEntry } from '../time-entries/time-entry.model';
import { TimeEntryStatus } from '../../common/types/enums';

export interface DashboardMetrics {
    activeProjects: number;
    totalEmployees: number;
    avgUtilization: number;
    hoursThisWeek: number;
    pendingApprovals: number;
    approvedHours: number;
    rejectedHours: number;
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

/** Single source of truth for dashboard stat cards and AI insight metrics. */
export async function collectDashboardMetrics(): Promise<DashboardMetrics> {
    const activeProjects = await Project.countDocuments({ status: 'Active' });

    const totalEmployees = await Employee.countDocuments({
        $or: [{ is_active: true }, { status: 'Active' }],
    });

    const activeAllocations = await ProjectAllocation.find({ is_active: true });
    const totalAllocationSum = activeAllocations.reduce(
        (sum, acc) => sum + (acc.allocation_percent || 0),
        0
    );
    const avgUtilization =
        totalEmployees > 0 ? Math.round(totalAllocationSum / totalEmployees) : 0;

    const { weekStart, weekEnd } = getCurrentUtcWeekBounds();
    const weeklyTimeEntries = await TimeEntry.find({
        date: { $gte: weekStart, $lte: weekEnd },
    });
    const hoursThisWeek = weeklyTimeEntries.reduce(
        (sum, entry) => sum + (entry.hours || 0),
        0
    );

    const pendingApprovals = await TimeEntry.countDocuments({
        status: TimeEntryStatus.SUBMITTED,
    });

    const approvedEntries = await TimeEntry.find({ status: TimeEntryStatus.PM_APPROVED });
    const approvedHours = approvedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    const rejectedEntries = await TimeEntry.find({ status: TimeEntryStatus.PM_REJECTED });
    const rejectedHours = rejectedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    return {
        activeProjects,
        totalEmployees,
        avgUtilization,
        hoursThisWeek,
        pendingApprovals,
        approvedHours,
        rejectedHours,
    };
}
