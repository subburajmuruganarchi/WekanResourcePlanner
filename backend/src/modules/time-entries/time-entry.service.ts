import { TimeEntry, ITimeEntry } from './time-entry.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { Types, startSession } from 'mongoose';
import { TimeEntryStatus } from '../../common/types/enums';

export interface CreateTimeEntryRequest {
    employeeId: string;
    projectId: string;
    timeCodeId: string;
    date: string;
    hours: number;
    comments?: string;
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

            // Validate date
            const entryDate = new Date(request.date);
            if (isNaN(entryDate.getTime())) {
                throw new Error('Invalid date format');
            }

            // Validate hours
            if (request.hours <= 0 || request.hours > 24) {
                throw new Error('Hours must be between 0.01 and 24');
            }

            // Calculate week start date (Monday)
            const weekStartDate = this.getWeekStartDate(entryDate);

            // Validate employee is allocated to this project
            const allocation = await ProjectAllocation.findOne({
                employeeId: new Types.ObjectId(request.employeeId),
                projectId: new Types.ObjectId(request.projectId),
                isActive: true,
                startDate: { $lte: entryDate },
                endDate: { $gte: entryDate }
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

            const currentWeeklyHours = existingWeeklyEntries.reduce(
                (sum, entry) => sum + entry.hours, 0
            );
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

            const currentDailyHours = existingDailyEntries.reduce(
                (sum, entry) => sum + entry.hours, 0
            );

            if (currentDailyHours + request.hours > 24) {
                throw new Error(
                    `Daily hour limit (24h) exceeded. ` +
                    `Current: ${currentDailyHours}h for ${request.date}.`
                );
            }

            // Create the time entry
            const [timeEntry] = await TimeEntry.create([{
                employeeId: new Types.ObjectId(request.employeeId),
                projectId: new Types.ObjectId(request.projectId),
                timeCodeId: new Types.ObjectId(request.timeCodeId),
                date: entryDate,
                hours: request.hours,
                comments: request.comments,
                weekStartDate,
                status: TimeEntryStatus.DRAFT
            }], { session });

            await session.commitTransaction();

            return this.mapToResponse(timeEntry);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    private getWeekStartDate(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        // Adjust to Monday (day 1). If Sunday (0), go back 6 days
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
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
            status: entry.status
        };
    }

    /**
     * Get all time entries for an employee for a specific week
     */
    async getByEmployee(employeeId: string, weekStart: string): Promise<TimeEntryResponse[]> {
        if (!Types.ObjectId.isValid(employeeId)) {
            throw new Error('Invalid employee ID');
        }

        const weekStartDate = new Date(weekStart);
        if (isNaN(weekStartDate.getTime())) {
            throw new Error('Invalid week start date');
        }

        const entries = await TimeEntry.find({
            employeeId: new Types.ObjectId(employeeId),
            weekStartDate
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
            employeeId: new Types.ObjectId(employeeId),
            isActive: true,
            startDate: { $lte: weekEndDate },
            endDate: { $gte: weekStartDate }
        }).populate('projectId', 'name code');

        const byProject: { projectId: string; projectName: string; estimatedHours: number; percentage: number }[] = [];
        let totalEstimated = 0;

        for (const alloc of allocations) {
            // Calculate days of overlap within the week
            const allocStart = new Date(Math.max(alloc.startDate.getTime(), weekStartDate.getTime()));
            const allocEnd = new Date(Math.min(alloc.endDate.getTime(), weekEndDate.getTime()));
            const daysOverlap = Math.ceil((allocEnd.getTime() - allocStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Estimated hours = (percentage/100) * 40h * (daysOverlap/7)
            const estimatedHours = (alloc.percentage / 100) * WEEKLY_HOUR_CAP * (daysOverlap / 7);
            const project = alloc.projectId as unknown as { _id: Types.ObjectId; name: string; code: string };

            byProject.push({
                projectId: project._id.toString(),
                projectName: project.name || project.code,
                estimatedHours: Math.round(estimatedHours * 10) / 10,
                percentage: alloc.percentage
            });

            totalEstimated += estimatedHours;
        }

        return {
            totalEstimated: Math.round(totalEstimated * 10) / 10,
            byProject
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
            status: TimeEntryStatus.DRAFT // Can only delete draft entries
        });

        if (!entry) {
            throw new Error('Entry not found or cannot be deleted');
        }

        await TimeEntry.deleteOne({ _id: entry._id });
    }
}

export const timeEntryService = new TimeEntryService();
