import { TimeEntry, ITimeEntry } from './time-entry.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { Role } from '../roles/role.model';
import { notificationService } from '../notifications/notification.service';
import { structuredLogger } from '../../common/logger';
import { NotificationType } from '../notifications/notification.model';
import { Types, startSession } from 'mongoose';
import { TimeEntryStatus } from '../../common/types/enums';
import { features } from '../../config/features';
import { weeklyActualsSyncService } from '../../services/weekly-actuals/weekly-actuals-sync.service';
import { isFutureUtcWeek } from '../../common/utils/week.util';

export interface CreateTimeEntryRequest {
    employeeId: string;
    projectId: string;
    timeCodeId: string;
    date: string;
    hours: number;
    comments?: string;
    overrideReason?: string;
    requestingUserId?: string;
}

export interface TimeEntryResponse {
    id: string;
    employeeId: string;
    projectId: string;
    timeCodeId: string;
    date: string;
    hours: number;
    comments?: string;
    weekStartDate: string;
    status: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionComment?: string;
}

// Weekly hour cap constant (40 hours standard, can be overridden)
const WEEKLY_HOUR_CAP = 40;

export class TimeEntryService {
    async createTimeEntry(request: CreateTimeEntryRequest): Promise<TimeEntryResponse> {
        const session = await startSession();
        session.startTransaction();

        try {
            // Validate IDs
            if (!Types.ObjectId.isValid(request.employeeId)) {
                throw new Error('Invalid employee ID');
            }
            if (!Types.ObjectId.isValid(request.projectId)) {
                throw new Error('Invalid project ID');
            }
            if (!Types.ObjectId.isValid(request.timeCodeId)) {
                throw new Error('Invalid time code ID');
            }

            // Validate date (UTC date-only to match week queries)
            const entryDate = new Date(request.date + 'T00:00:00.000Z');
            if (isNaN(entryDate.getTime())) {
                throw new Error('Invalid date format');
            }

            // Validate hours
            if (request.hours <= 0 || request.hours > 24) {
                throw new Error('Hours must be between 0.01 and 24');
            }

            // 1. Check if user is Admin
            let userIsAdmin = false;
            if (request.requestingUserId) {
                userIsAdmin = await this.isAdmin(request.requestingUserId);
            }

            // Check if an existing entry for this employee+project+date is non-DRAFT (locked)
            const existingEntry = await TimeEntry.findOne({
                employeeId: new Types.ObjectId(request.employeeId),
                projectId: new Types.ObjectId(request.projectId),
                date: entryDate
            }).session(session);

            if (existingEntry && existingEntry.status !== TimeEntryStatus.DRAFT && !userIsAdmin) {
                if (existingEntry.status === TimeEntryStatus.PM_APPROVED) {
                    throw new Error(
                        'This time entry has been approved by the Project Manager and is now immutable. It cannot be modified.'
                    );
                }
                throw new Error(
                    `Cannot edit this time entry — it is currently "${existingEntry.status}". ` +
                    'Only DRAFT entries can be modified.'
                );
            }

            // Calculate week start date (Monday)
            const weekStartDate = this.getWeekStartDate(entryDate);

            // Validate employee is allocated to this project
            const allocation = await ProjectAllocation.findOne({
                employee_id: new Types.ObjectId(request.employeeId),
                project_id: new Types.ObjectId(request.projectId),
                is_active: true,
                start_date: { $lte: entryDate },
                end_date: { $gte: entryDate }
            }).session(session);

            if (!allocation) {
                throw new Error(
                    'Employee is not allocated to this project for the selected date. ' +
                    'Time entries can only be logged against allocated projects.'
                );
            }

            // Check weekly hour cap
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);

            const existingWeeklyEntries = await TimeEntry.find({
                employeeId: new Types.ObjectId(request.employeeId),
                weekStartDate
            }).session(session);

            const currentWeeklyHours = existingWeeklyEntries.reduce((sum, entry) => {
                if (existingEntry && entry._id.equals(existingEntry._id)) return sum;
                return sum + entry.hours;
            }, 0);
            const newTotalHours = currentWeeklyHours + request.hours;

            if (newTotalHours > WEEKLY_HOUR_CAP) {
                throw new Error(
                    `Weekly hour cap (${WEEKLY_HOUR_CAP}h) exceeded. ` +
                    `Current: ${currentWeeklyHours}h, Requested: ${request.hours}h, ` +
                    `Total would be: ${newTotalHours}h.`
                );
            }

            // Check daily hour limit (can't exceed 24 hours per day)
            const existingDailyEntries = await TimeEntry.find({
                employeeId: new Types.ObjectId(request.employeeId),
                date: entryDate
            }).session(session);

            const currentDailyHours = existingDailyEntries.reduce((sum, entry) => {
                if (existingEntry && entry._id.equals(existingEntry._id)) return sum;
                return sum + entry.hours;
            }, 0);

            if (currentDailyHours + request.hours > 24) {
                throw new Error(
                    `Daily hour limit (24h) exceeded. ` +
                    `Current: ${currentDailyHours}h for ${request.date}.`
                );
            }

            // Fetch project to get PM ID for denormalization
            const project = await Project.findById(request.projectId).session(session);
            if (!project) throw new Error('Project not found');

            // Upsert the time entry (update if exists for same employee + project + date)
            const updateData: any = {
                timeCodeId: new Types.ObjectId(request.timeCodeId),
                hours: request.hours,
                comments: request.comments,
                weekStartDate,
                projectManagerUserId: project.project_manager_id,
                status: TimeEntryStatus.DRAFT
            };

            if (userIsAdmin && existingEntry && existingEntry.status === TimeEntryStatus.PM_APPROVED) {
                updateData.status = TimeEntryStatus.PM_APPROVED;
                updateData.overriddenBy = new Types.ObjectId(request.requestingUserId);
                updateData.overriddenAt = new Date();
                updateData.overrideReason = request.overrideReason || 'Admin Override';
            }

            const timeEntry = await TimeEntry.findOneAndUpdate(
                {
                    employeeId: new Types.ObjectId(request.employeeId),
                    projectId: new Types.ObjectId(request.projectId),
                    date: entryDate
                },
                { $set: updateData },
                { upsert: true, new: true, session }
            );

            await session.commitTransaction();

            if (!timeEntry) throw new Error('Failed to save time entry');

            return this.mapToResponse(timeEntry);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    private getWeekStartDate(date: Date): Date {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const day = d.getUTCDay();
        // Adjust to Monday (day 1). If Sunday (0), go back 6 days
        const diff = day === 0 ? 6 : day - 1;
        d.setUTCDate(d.getUTCDate() - diff);
        return d;
    }

    private mapToResponse(entry: ITimeEntry): TimeEntryResponse {
        return {
            id: entry._id.toString(),
            employeeId: entry.employeeId.toString(),
            projectId: entry.projectId.toString(),
            timeCodeId: entry.timeCodeId.toString(),
            date: entry.date.toISOString().split('T')[0],
            hours: entry.hours,
            comments: entry.comments,
            weekStartDate: entry.weekStartDate.toISOString().split('T')[0],
            status: entry.status,
            approvedBy: entry.approvedBy?.toString(),
            approvedAt: entry.approvedAt?.toISOString(),
            rejectedBy: entry.rejectedBy?.toString(),
            rejectedAt: entry.rejectedAt?.toISOString(),
            rejectionComment: entry.rejectionComment,
        };
    }

    /**
     * Get all time entries for an employee for a specific week
     */
    async getByEmployee(employeeId: string, weekStart: string): Promise<TimeEntryResponse[]> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new Error('Invalid employee ID');
        }

        const weekStartDate = new Date(weekStart + 'T00:00:00.000Z');
        if (isNaN(weekStartDate.getTime())) {
            throw new Error('Invalid week start date');
        }

        // Use a date range to handle timezone variations in stored data
        const dayBefore = new Date(weekStartDate);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
        const dayAfter = new Date(weekStartDate);
        dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

        const entries = await TimeEntry.find({
            employeeId: new Types.ObjectId(employeeId),
            weekStartDate: { $gte: dayBefore, $lte: dayAfter }
        }).sort({ date: 1 });

        return entries.map(e => this.mapToResponse(e));
    }

    /**
     * Get estimated hours for an employee for a specific week based on allocations
     */
    async getEstimatedHours(employeeId: string, weekStart: string): Promise<{
        totalEstimated: number;
        byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[];
    }> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new Error('Invalid employee ID');
        }

        const weekStartDate = new Date(weekStart);
        if (isNaN(weekStartDate.getTime())) {
            throw new Error('Invalid week start date');
        }

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Find all active allocations that overlap with this week
        const allocations = await ProjectAllocation.find({
            employee_id: new Types.ObjectId(employeeId),
            is_active: true,
            start_date: { $lte: weekEndDate },
            end_date: { $gte: weekStartDate }
        }).populate('project_id', 'project_name project_code');

        const byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[] = [];
        let totalEstimated = 0;

        for (const alloc of allocations) {
            // Count weekday overlap only
            let weekdayCount = 0;
            for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
                const dow = d.getDay();
                if (dow >= 1 && dow <= 5) { // Mon-Fri
                    if (d >= alloc.start_date && d <= alloc.end_date) {
                        weekdayCount++;
                    }
                }
            }

            const estimatedHours = (alloc.allocation_percent / 100) * 8 * weekdayCount;
            const project = alloc.project_id as unknown as { _id: Types.ObjectId; project_name: string; project_code: string };

            byProject.push({
                projectId: project._id.toString(),
                projectName: project.project_name || project.project_code,
                estimatedHours: Math.round(estimatedHours * 10) / 10,
                percentage: alloc.allocation_percent
            });

            totalEstimated += estimatedHours;
        }

        return {
            totalEstimated: Math.round(totalEstimated * 10) / 10,
            byProject
        };
    }

    /**
     * Get daily forecast hours for an employee for a specific week based on allocations.
     * Only weekdays (Mon-Fri) get forecast hours. Each day = 8h * allocation%.
     */
    async getDailyForecast(employeeId: string, weekStart: string): Promise<{
        weekTotal: number;
        days: {
            date: string;
            dayName: string;
            isWeekday: boolean;
            totalForecast: number;
            byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[];
        }[];
    }> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new Error('Invalid employee ID');
        }

        const weekStartDate = new Date(weekStart);
        if (isNaN(weekStartDate.getTime())) {
            throw new Error('Invalid week start date');
        }

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Find all active allocations that overlap with this week
        const allocations = await ProjectAllocation.find({
            employee_id: new Types.ObjectId(employeeId),
            is_active: true,
            start_date: { $lte: weekEndDate },
            end_date: { $gte: weekStartDate }
        }).populate('project_id', 'project_name project_code');

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const HOURS_PER_DAY = 8;

        const days: {
            date: string;
            dayName: string;
            isWeekday: boolean;
            totalForecast: number;
            byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[];
        }[] = [];

        let weekTotal = 0;

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(weekStartDate.getDate() + i);
            const dow = currentDate.getDay();
            const isWeekday = dow >= 1 && dow <= 5;

            const byProject: { projectId: string; projectName: string; percentage: number; forecastHours: number }[] = [];
            let totalForecast = 0;

            if (isWeekday) {
                for (const alloc of allocations) {
                    // Check if allocation covers this specific day
                    if (currentDate >= alloc.start_date && currentDate <= alloc.end_date) {
                        const forecastHours = Math.round(((alloc.allocation_percent / 100) * HOURS_PER_DAY) * 10) / 10;
                        const project = alloc.project_id as unknown as { _id: Types.ObjectId; project_name: string; project_code: string };

                        byProject.push({
                            projectId: project._id.toString(),
                            projectName: project.project_name || project.project_code,
                            percentage: alloc.allocation_percent,
                            forecastHours
                        });

                        totalForecast += forecastHours;
                    }
                }
            }

            totalForecast = Math.round(totalForecast * 10) / 10;
            weekTotal += totalForecast;

            days.push({
                date: currentDate.toISOString().split('T')[0],
                dayName: dayNames[dow],
                isWeekday,
                totalForecast,
                byProject
            });
        }

        return {
            weekTotal: Math.round(weekTotal * 10) / 10,
            days
        };
    }

    /**
     * Delete a time entry by ID
     */
    async deleteEntry(entryId: string, employeeId: string): Promise<void> {
        if (!Types.ObjectId.isValid(entryId)) {
            throw new Error('Invalid entry ID');
        }

        const entry = await TimeEntry.findOne({
            _id: new Types.ObjectId(entryId),
            employeeId: new Types.ObjectId(employeeId),
        });

        if (!entry) {
            throw new Error('Entry not found');
        }

        if (entry.status === TimeEntryStatus.PM_APPROVED) {
            throw new Error('Cannot delete an approved time entry. Approved entries are immutable.');
        }

        if (entry.status !== TimeEntryStatus.DRAFT) {
            throw new Error(`Cannot delete this entry — it is currently "${entry.status}". Only DRAFT entries can be deleted.`);
        }

        await TimeEntry.deleteOne({ _id: entry._id });
    }

    /**
     * Submit all DRAFT entries for an employee for a specific week.
     * Validates daily (24h) and weekly (40h) caps before transitioning DRAFT → SUBMITTED.
     * @param adminOverride - If true, bypasses the 40h weekly cap (for admin use only).
     */
    async submitWeeklyEntries(
        employeeId: string,
        weekStart: string,
        adminOverride: boolean = false
    ): Promise<{ submitted: number; totalWeeklyHours: number; warnings: string[] }> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new Error('Invalid employee ID');
        }

        const weekStartDate = new Date(weekStart + 'T00:00:00.000Z');
        if (isNaN(weekStartDate.getTime())) {
            throw new Error('Invalid week start date');
        }

        if (isFutureUtcWeek(weekStartDate)) {
            throw new Error('Cannot submit timesheets for future weeks.');
        }

        const dayBefore = new Date(weekStartDate);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
        const dayAfter = new Date(weekStartDate);
        dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

        // Fetch ALL entries for this employee & week (DRAFT and any already-submitted)
        const allEntries = await TimeEntry.find({
            employeeId: new Types.ObjectId(employeeId),
            weekStartDate: { $gte: dayBefore, $lte: dayAfter },
        });

        const draftEntries = allEntries.filter(e => e.status === TimeEntryStatus.DRAFT);

        if (draftEntries.length === 0) {
            throw new Error('No DRAFT entries found for this week to submit.');
        }

        // ---- Pre-submission Validation ----
        const warnings: string[] = [];

        // 0. Each weekday (Mon–Fri) must have at least one entry with hours
        const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const missingWeekdays: string[] = [];
        for (let i = 0; i < 5; i++) {
            const dayDate = new Date(weekStartDate);
            dayDate.setUTCDate(dayDate.getUTCDate() + i);
            const dayKey = dayDate.toISOString().split('T')[0];
            const hasHours = allEntries.some(
                (e) => e.date.toISOString().split('T')[0] === dayKey && e.hours > 0
            );
            if (!hasHours) {
                missingWeekdays.push(weekdayNames[i]);
            }
        }
        if (missingWeekdays.length > 0) {
            throw new Error(
                `Complete all weekdays before submitting. Missing time entries for: ${missingWeekdays.join(', ')}.`
            );
        }

        // 1. Daily hours check (no single day > 24h)
        const hoursByDay = new Map<string, number>();
        for (const entry of allEntries) {
            const dayKey = entry.date.toISOString().split('T')[0];
            hoursByDay.set(dayKey, (hoursByDay.get(dayKey) || 0) + entry.hours);
        }

        for (const [day, hours] of hoursByDay) {
            if (hours > 24) {
                throw new Error(
                    `Daily hour limit exceeded on ${day}: ${hours}h logged (max 24h). ` +
                    'Please correct entries before submitting.'
                );
            }
        }

        // 2. Weekly hours check (no more than 40h unless admin override)
        const totalWeeklyHours = allEntries.reduce((sum, e) => sum + e.hours, 0);

        if (totalWeeklyHours > WEEKLY_HOUR_CAP) {
            if (!adminOverride) {
                throw new Error(
                    `Weekly hour cap exceeded: ${totalWeeklyHours}h logged (max ${WEEKLY_HOUR_CAP}h). ` +
                    'Reduce hours or request an admin override.'
                );
            }
            // Admin override — allow but add a warning
            warnings.push(
                `Admin override used: ${totalWeeklyHours}h exceeds the ${WEEKLY_HOUR_CAP}h weekly cap.`
            );
        }

        // ---- All validations passed — transition DRAFT → SUBMITTED ----
        const result = await TimeEntry.updateMany(
            {
                employeeId: new Types.ObjectId(employeeId),
                weekStartDate: { $gte: dayBefore, $lte: dayAfter },
                status: TimeEntryStatus.DRAFT
            },
            { $set: { status: TimeEntryStatus.SUBMITTED } }
        );

        // ---- Notifications: Notify Project Managers ----
        try {
            const employee = await Employee.findById(employeeId);
            const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'An employee';
            
            // Find all unique project IDs from the submitted entries
            const projectIds = [...new Set(draftEntries.map(e => e.projectId.toString()))];
            
            // For each project, notify its PM
            for (const projId of projectIds) {
                const project = await Project.findById(projId);
                const pmId = project?.project_manager_id?.toString();
                if (project && pmId) {
                    await notificationService.createNotification(
                        pmId,
                        'Timesheet Submitted',
                        `${employeeName} has submitted a timesheet for the week of ${weekStart} on project ${project.project_code}.`,
                        NotificationType.INFO,
                        { employeeId, projectId: projId, weekStart }
                    );
                }
            }
        } catch (err) {
            structuredLogger.error('Failed to send submission notifications', {
                module: 'time-entries',
                employeeId,
                error: err instanceof Error ? err.message : String(err),
            });
        }

        return {
            submitted: result.modifiedCount,
            totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
            warnings
        };
    }

    /**
     * Approve time entries. Only the Project Manager of the project can approve.
     * Security: PM cannot approve their own entries.
     */
    async approveEntries(entryIds: string[], pmUserId: string, options?: { overrideReason?: string }): Promise<{ approved: number }> {
        if (!Types.ObjectId.isValid(pmUserId)) {
            throw new Error('Invalid PM user ID');
        }

        const userIsAdmin = await this.isAdmin(pmUserId);

        const entries = await TimeEntry.find({
            _id: { $in: entryIds.map(id => new Types.ObjectId(id)) },
            status: TimeEntryStatus.SUBMITTED
        });

        if (entries.length === 0) {
            throw new Error('No SUBMITTED entries found for the given IDs.');
        }

        // Security: Employees cannot approve their own timesheets (unrestricted for Admins)
        if (!userIsAdmin) {
            const selfEntries = entries.filter(e => e.employeeId.toString() === pmUserId);
            if (selfEntries.length > 0) {
                throw new Error(
                    'Security violation: You cannot approve your own timesheet entries. ' +
                    'Another manager must approve them.'
                );
            }
        }

        // Validate PM authorization for each entry's project (unrestricted for Admins)
        if (!userIsAdmin) {
            const projectIds = [...new Set(entries.map(e => e.projectId.toString()))];
            for (const projId of projectIds) {
                const project = await Project.findById(projId);
                if (!project) throw new Error(`Project ${projId} not found.`);
                if (project.project_manager_id?.toString() !== pmUserId) {
                    throw new Error(
                        `User is not the Project Manager for project "${project.project_name}". Only the assigned PM can approve entries.`
                    );
                }
            }
        }

        const now = new Date();
        const updatePayload: any = {
            status: TimeEntryStatus.PM_APPROVED,
            approvedBy: new Types.ObjectId(pmUserId),
            approvedAt: now,
        };

        if (userIsAdmin) {
            updatePayload.overriddenBy = new Types.ObjectId(pmUserId);
            updatePayload.overriddenAt = now;
            updatePayload.overrideReason = options?.overrideReason || 'Admin Override';
        }

        await TimeEntry.updateMany(
            {
                _id: { $in: entryIds.map(id => new Types.ObjectId(id)) },
                status: TimeEntryStatus.SUBMITTED
            },
            {
                $set: updatePayload,
                $unset: {
                    rejectedBy: 1,
                    rejectedAt: 1,
                    rejectionComment: 1
                }
            }
        );

        // ---- Notifications: Notify Employees ----
        try {
            const pm = await Employee.findById(pmUserId);
            const pmName = pm ? `${pm.first_name} ${pm.last_name}` : 'Project Manager';

            // Group by employee to avoid spamming
            const entriesByEmployee = new Map<string, number>();
            for (const entry of entries) {
                const empId = entry.employeeId.toString();
                entriesByEmployee.set(empId, (entriesByEmployee.get(empId) || 0) + 1);
            }

            for (const [empId, count] of entriesByEmployee.entries()) {
                await notificationService.createNotification(
                    empId,
                    'Timesheet Approved',
                    `${pmName} has approved ${count} of your timesheet entries.`,
                    NotificationType.SUCCESS,
                    { pmUserId, count }
                );
            }
        } catch (err) {
            structuredLogger.error('Failed to send approval notifications', {
                module: 'time-entries',
                pmUserId,
                error: err instanceof Error ? err.message : String(err),
            });
        }

        if (features.weeklyActualsSyncEnabled) {
            void weeklyActualsSyncService
                .syncForApprovedEntryIds(entryIds, new Types.ObjectId(pmUserId))
                .catch((syncErr: Error) => {
                    structuredLogger.error('Weekly actuals sync after approval failed', {
                        module: 'time-entries',
                        error: syncErr.message,
                    });
                });
        }

        return { approved: entries.length };
    }

    /**
     * Reject time entries. Only the Project Manager of the project can reject.
     * Security: PM cannot reject their own entries.
     */
    async rejectEntries(entryIds: string[], pmUserId: string, rejectionComment?: string, options?: { overrideReason?: string }): Promise<{ rejected: number }> {
        if (!Types.ObjectId.isValid(pmUserId)) {
            throw new Error('Invalid PM user ID');
        }

        if (rejectionComment && rejectionComment.length > 500) {
            throw new Error('Rejection comment cannot exceed 500 characters.');
        }

        const userIsAdmin = await this.isAdmin(pmUserId);

        const entries = await TimeEntry.find({
            _id: { $in: entryIds.map(id => new Types.ObjectId(id)) },
            status: TimeEntryStatus.SUBMITTED
        });

        if (entries.length === 0) {
            throw new Error('No SUBMITTED entries found for the given IDs.');
        }

        // Security: Employees cannot reject their own timesheets (unrestricted for Admins)
        if (!userIsAdmin) {
            const selfEntries = entries.filter(e => e.employeeId.toString() === pmUserId);
            if (selfEntries.length > 0) {
                throw new Error(
                    'Security violation: You cannot reject your own timesheet entries.'
                );
            }
        }

        // Validate PM authorization (unrestricted for Admins)
        if (!userIsAdmin) {
            const projectIds = [...new Set(entries.map(e => e.projectId.toString()))];
            for (const projId of projectIds) {
                const project = await Project.findById(projId);
                if (!project) throw new Error(`Project ${projId} not found.`);
                if (project.project_manager_id?.toString() !== pmUserId) {
                    throw new Error(
                        `User is not the Project Manager for project "${project.project_name}". Only the assigned PM can reject entries.`
                    );
                }
            }
        }

        const now = new Date();
        const updatePayload: any = {
            status: TimeEntryStatus.PM_REJECTED,
            rejectedBy: new Types.ObjectId(pmUserId),
            rejectedAt: now,
            rejectionComment: rejectionComment || undefined
        };

        if (userIsAdmin) {
            updatePayload.overriddenBy = new Types.ObjectId(pmUserId);
            updatePayload.overriddenAt = now;
            updatePayload.overrideReason = options?.overrideReason || rejectionComment || 'Admin Override';
        }

        await TimeEntry.updateMany(
            {
                _id: { $in: entryIds.map(id => new Types.ObjectId(id)) },
                status: TimeEntryStatus.SUBMITTED
            },
            {
                $set: updatePayload,
                $unset: {
                    approvedBy: 1,
                    approvedAt: 1
                }
            }
        );

        // ---- Notifications: Notify Employees ----
        try {
            const pm = await Employee.findById(pmUserId);
            const pmName = pm ? `${pm.first_name} ${pm.last_name}` : 'Project Manager';

            // Group by employee to avoid spamming
            const entriesByEmployee = new Map<string, number>();
            for (const entry of entries) {
                const empId = entry.employeeId.toString();
                entriesByEmployee.set(empId, (entriesByEmployee.get(empId) || 0) + 1);
            }

            for (const [empId, count] of entriesByEmployee.entries()) {
                await notificationService.createNotification(
                    empId,
                    'Timesheet Rejected',
                    `${pmName} has rejected ${count} of your timesheet entries.` +
                    (rejectionComment ? `\nReason: "${rejectionComment}"` : ''),
                    NotificationType.ERROR,
                    { pmUserId, rejectionComment, count }
                );
            }
        } catch (err) {
            structuredLogger.error('Failed to send rejection notifications', {
                module: 'time-entries',
                pmUserId,
                error: err instanceof Error ? err.message : String(err),
            });
        }

        return { rejected: entries.length };
    }

    /**
     * Get all SUBMITTED entries for projects managed by a specific PM.
     * Returns rich data with employee name, project name, and time code for the dashboard.
     */
    async getPendingApprovalForPM(
        pmUserId: string,
        options?: { includeAll?: boolean }
    ): Promise<any[]> {
        if (!options?.includeAll && !Types.ObjectId.isValid(pmUserId)) {
            throw new Error('Invalid PM user ID');
        }

        const filter: Record<string, unknown> = {
            status: TimeEntryStatus.SUBMITTED,
        };
        if (!options?.includeAll) {
            filter.projectManagerUserId = new Types.ObjectId(pmUserId);
        }

        const entries = await TimeEntry.find(filter)
            .populate('projectId', 'project_name project_code')
            .populate('employeeId', 'first_name last_name email')
            .populate('timeCodeId', 'code description isBillable')
            .sort({ date: 1 })
            .lean();

        return entries.map((e: any) => {
            const emp = e.employeeId;
            const tc = e.timeCodeId;
            const proj = e.projectId;

            return {
                id: e._id.toString(),
                employeeId: emp?._id?.toString() || e.employeeId?.toString(),
                employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                employeeEmail: emp?.email || '',
                projectId: e.projectId?.toString(),
                projectName: proj?.project_name || 'Unknown',
                projectCode: proj?.project_code || '',
                timeCodeId: tc?._id?.toString() || e.timeCodeId?.toString(),
                timeCode: tc?.code || '',
                timeCodeDescription: tc?.description || '',
                isBillable: tc?.isBillable ?? false,
                date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
                hours: e.hours,
                comments: e.comments || '',
                weekStartDate: e.weekStartDate ? new Date(e.weekStartDate).toISOString().split('T')[0] : '',
                status: e.status,
            };
        });
    }

    /**
     * Get time entries for a specific project with optional filters.
     * Used by the Project Detail "Timesheet Approvals" tab.
     */
    async getEntriesByProject(
        projectId: string,
        filters?: { week?: string; employeeId?: string; status?: string }
    ): Promise<any[]> {
        if (!Types.ObjectId.isValid(projectId)) {
            throw new Error('Invalid project ID');
        }

        const query: any = { projectId: new Types.ObjectId(projectId) };

        if (filters?.week) {
            const weekStartDate = new Date(filters.week + 'T00:00:00.000Z');
            if (!isNaN(weekStartDate.getTime())) {
                query.weekStartDate = weekStartDate;
            }
        }

        if (filters?.employeeId && Types.ObjectId.isValid(filters.employeeId)) {
            query.employeeId = new Types.ObjectId(filters.employeeId);
        }

        if (filters?.status) {
            query.status = filters.status;
        }

        const project = await Project.findById(projectId).lean();

        const entries = await TimeEntry.find(query)
            .populate('employeeId', 'first_name last_name email')
            .populate('timeCodeId', 'code description isBillable')
            .sort({ date: 1 })
            .lean();

        return entries.map((e: any) => {
            const emp = e.employeeId;
            const tc = e.timeCodeId;

            return {
                id: e._id.toString(),
                employeeId: emp?._id?.toString() || e.employeeId?.toString(),
                employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                employeeEmail: emp?.email || '',
                projectId: e.projectId?.toString(),
                projectName: project?.project_name || 'Unknown',
                projectCode: project?.project_code || '',
                timeCodeId: tc?._id?.toString() || e.timeCodeId?.toString(),
                timeCode: tc?.code || '',
                timeCodeDescription: tc?.description || '',
                isBillable: tc?.isBillable ?? false,
                date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
                hours: e.hours,
                comments: e.comments || '',
                weekStartDate: e.weekStartDate ? new Date(e.weekStartDate).toISOString().split('T')[0] : '',
                status: e.status,
                approvedBy: e.approvedBy?.toString(),
                approvedAt: e.approvedAt ? new Date(e.approvedAt).toISOString() : undefined,
                rejectedBy: e.rejectedBy?.toString(),
                rejectedAt: e.rejectedAt ? new Date(e.rejectedAt).toISOString() : undefined,
                rejectionComment: e.rejectionComment,
            };
        });
    }

    /**
     * Checks if a user has the 'Admin' role.
     */
    async isAdmin(userId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(userId)) return false;
        
        const employee = await Employee.findById(userId).populate('role_id').lean();
        if (!employee || !employee.role_id) return false;
        
        // Typescript casting as populate returns either ObjectId or populated IRole
        const role = employee.role_id as any;
        return role.role_name === 'Admin';
    }
}

export const timeEntryService = new TimeEntryService();
