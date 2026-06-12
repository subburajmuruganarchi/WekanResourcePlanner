import mongoose from 'mongoose';
import { TimeEntry } from '../time-entries/time-entry.model';
import { TimeCode } from '../time-entries/time-code.model';
import { Project } from '../projects/project.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { Employee } from '../employees/employee.model';
import { Role } from '../roles/role.model';
import { Notification } from '../notifications/notification.model';
import { TimeEntryStatus } from '../../common/types/enums';

export interface HealthSummary {
    timeEntryStatusCounts: Record<string, number>;
    submittedWithoutPM: number;
    legacyRoles: number;
    employeeCounts: {
        byIsActive: number;
        byStatusActive: number;
        combinedActive: number;
    };
    notifications: {
        total: number;
        unread: number;
        failureTrackingAvailable: boolean;
    };
    overallStatus: 'healthy' | 'warning' | 'critical';
    warnings: string[];
}

export interface VerifyResult {
    status: 'PASS' | 'WARN' | 'FAIL';
    issues: string[];
}

export async function buildHealthSummary(): Promise<HealthSummary> {
    const statusAgg = await TimeEntry.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const timeEntryStatusCounts: Record<string, number> = {};
    for (const row of statusAgg) {
        timeEntryStatusCounts[row._id ?? 'unknown'] = row.count;
    }

    const submittedWithoutPM = await TimeEntry.countDocuments({
        status: TimeEntryStatus.SUBMITTED,
        $or: [
            { projectManagerUserId: { $exists: false } },
            { projectManagerUserId: null },
        ],
    });

    const legacyRoles = await Role.countDocuments({ role_name: 'ProjectManager' });

    const byIsActive = await Employee.countDocuments({ is_active: true });
    const byStatusActive = await Employee.countDocuments({ status: 'Active' });
    const combinedActive = await Employee.countDocuments({
        $or: [{ is_active: true }, { status: 'Active' }],
    });

    const totalNotifications = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ read: false });

    const warnings: string[] = [];
    let overallStatus: HealthSummary['overallStatus'] = 'healthy';

    if (submittedWithoutPM > 0) {
        warnings.push(`${submittedWithoutPM} submitted entries missing projectManagerUserId`);
        overallStatus = 'warning';
    }
    if (legacyRoles > 0) {
        warnings.push(`${legacyRoles} role(s) still named "ProjectManager" — run migrate:roles`);
        overallStatus = 'warning';
    }
    if (Math.abs(byIsActive - combinedActive) > 0 || Math.abs(byStatusActive - combinedActive) > 0) {
        warnings.push(
            `Employee count drift: is_active=${byIsActive}, status Active=${byStatusActive}, combined=${combinedActive}`
        );
        if (overallStatus === 'healthy') overallStatus = 'warning';
    }

    const timeCodeCount = await TimeCode.countDocuments();
    if (timeCodeCount === 0) {
        warnings.push('No time codes configured');
        overallStatus = 'critical';
    }

    if (mongoose.connection.readyState !== 1) {
        warnings.push('Database not connected');
        overallStatus = 'critical';
    }

    return {
        timeEntryStatusCounts,
        submittedWithoutPM,
        legacyRoles,
        employeeCounts: { byIsActive, byStatusActive, combinedActive },
        notifications: {
            total: totalNotifications,
            unread,
            failureTrackingAvailable: false,
        },
        overallStatus,
        warnings,
    };
}

export async function runSystemVerify(): Promise<VerifyResult> {
    const issues: string[] = [];

    if (mongoose.connection.readyState !== 1) {
        return { status: 'FAIL', issues: ['Database not connected'] };
    }

    const timeCodeCount = await TimeCode.countDocuments();
    if (timeCodeCount === 0) {
        issues.push('No time codes configured');
    }

    const activeProjects = await Project.countDocuments({ status: 'Active' });
    if (activeProjects === 0) {
        issues.push('No active projects');
    }

    const activeAllocations = await ProjectAllocation.countDocuments({ is_active: true });
    if (activeAllocations === 0) {
        issues.push('No active allocations');
    }

    const legacyRoles = await Role.countDocuments({ role_name: 'ProjectManager' });
    if (legacyRoles > 0) {
        issues.push(`${legacyRoles} role(s) still use legacy name "ProjectManager" — run npm run migrate:roles`);
    }

    const submittedWithoutPM = await TimeEntry.countDocuments({
        status: TimeEntryStatus.SUBMITTED,
        $or: [
            { projectManagerUserId: { $exists: false } },
            { projectManagerUserId: null },
        ],
    });
    if (submittedWithoutPM > 0) {
        issues.push(`${submittedWithoutPM} submitted entries missing PM id — run migrate-pm-ids script`);
    }

    if (issues.some((i) => i.startsWith('No time codes') || i.startsWith('Database'))) {
        return { status: 'FAIL', issues };
    }
    if (issues.length > 0) {
        return { status: 'WARN', issues };
    }
    return { status: 'PASS', issues: [] };
}
