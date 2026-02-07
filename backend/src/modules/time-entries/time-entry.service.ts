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
}

export const timeEntryService = new TimeEntryService();
