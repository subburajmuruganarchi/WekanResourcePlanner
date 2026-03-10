import { Request, Response, NextFunction } from 'express';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { TimeEntry } from '../time-entries/time-entry.model';
import { TimeEntryStatus } from '../../common/types/enums';

export class DashboardController {
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Active Projects Count
            const activeProjectsCount = await Project.countDocuments({ status: 'Active' });

            // 2. Total Employees Count
            const totalEmployeesCount = await Employee.countDocuments({ status: 'Active' });

            // 3. Average Utilization
            // Calculate sum of all active allocation percentages / total active employees
            const activeAllocations = await ProjectAllocation.find({ is_active: true });
            const totalAllocationSum = activeAllocations.reduce((sum, acc) => sum + (acc.allocation_percent || 0), 0);
            const avgUtilization = totalEmployeesCount > 0 ? Math.round(totalAllocationSum / totalEmployeesCount) : 0;

            // 4. Hours This Week (Native JS implementation)
            const now = new Date();
            const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday...
            const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday

            const weekStart = new Date(now.setUTCDate(diff));
            weekStart.setUTCHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
            weekEnd.setUTCHours(23, 59, 59, 999);

            const weeklyTimeEntries = await TimeEntry.find({
                date: { $gte: weekStart, $lte: weekEnd }
            });
            const totalHoursThisWeek = weeklyTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

            // 5. Pending Approvals Count
            const pendingApprovalsCount = await TimeEntry.countDocuments({ status: TimeEntryStatus.SUBMITTED });

            // 6. Approved Hours (All time)
            const approvedEntries = await TimeEntry.find({ status: TimeEntryStatus.PM_APPROVED });
            const totalApprovedHours = approvedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

            // 7. Rejected Hours (All time)
            const rejectedEntries = await TimeEntry.find({ status: TimeEntryStatus.PM_REJECTED });
            const totalRejectedHours = rejectedEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

            res.json({
                status: 'success',
                data: {
                    activeProjects: activeProjectsCount,
                    totalEmployees: totalEmployeesCount,
                    avgUtilization: avgUtilization,
                    hoursThisWeek: totalHoursThisWeek,
                    pendingApprovals: pendingApprovalsCount,
                    approvedHours: totalApprovedHours,
                    rejectedHours: totalRejectedHours,
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export const dashboardController = new DashboardController();
