import { timeEntryService } from '../../modules/time-entries/time-entry.service';
import { ApprovalAnomaly, ApprovalInsightSummary } from './types';

const DAILY_HOURS_WARNING = 10;
const WEEKLY_HOURS_WARNING = 40;

/** Flags anomalies for PM review — never auto-approves. */
export async function analyzePendingApprovals(pmUserId: string): Promise<ApprovalInsightSummary> {
    const pending = await timeEntryService.getPendingApprovalForPM(pmUserId);
    const anomalies: ApprovalAnomaly[] = [];

    const byDayEmployee = new Map<string, typeof pending>();
    const byWeekEmployee = new Map<string, number>();
    const duplicateKeys = new Map<string, typeof pending>();

    for (const entry of pending) {
        const dayKey = `${entry.employeeId}:${entry.date}`;
        if (!byDayEmployee.has(dayKey)) byDayEmployee.set(dayKey, []);
        byDayEmployee.get(dayKey)!.push(entry);

        const weekKey = `${entry.employeeId}:${entry.weekStartDate}`;
        byWeekEmployee.set(weekKey, (byWeekEmployee.get(weekKey) || 0) + entry.hours);

        const dupKey = `${entry.employeeId}:${entry.projectId}:${entry.date}`;
        if (!duplicateKeys.has(dupKey)) duplicateKeys.set(dupKey, []);
        duplicateKeys.get(dupKey)!.push(entry);

        if (entry.hours > DAILY_HOURS_WARNING) {
            anomalies.push({
                severity: 'critical',
                type: 'unusual_hours',
                entryIds: [entry.id],
                message: `${entry.employeeName} logged ${entry.hours}h on ${entry.date} (above ${DAILY_HOURS_WARNING}h).`,
                employeeName: entry.employeeName,
                projectName: entry.projectName,
            });
        }

        const dow = new Date(entry.date + 'T12:00:00').getUTCDay();
        if (dow === 0 || dow === 6) {
            anomalies.push({
                severity: 'warning',
                type: 'weekend_work',
                entryIds: [entry.id],
                message: `Weekend entry: ${entry.employeeName} on ${entry.date} (${entry.hours}h).`,
                employeeName: entry.employeeName,
                projectName: entry.projectName,
            });
        }
    }

    for (const [key, entries] of duplicateKeys) {
        if (entries.length > 1) {
            anomalies.push({
                severity: 'warning',
                type: 'duplicate_entry',
                entryIds: entries.map((e) => e.id),
                message: `Multiple pending entries for same employee/project/day (${entries.length} rows).`,
                employeeName: entries[0].employeeName,
                projectName: entries[0].projectName,
            });
        }
    }

    for (const [weekKey, total] of byWeekEmployee) {
        if (total > WEEKLY_HOURS_WARNING) {
            const [employeeId, weekStart] = weekKey.split(':');
            const sample = pending.find((e) => e.employeeId === employeeId && e.weekStartDate === weekStart);
            anomalies.push({
                severity: 'warning',
                type: 'weekly_overtime',
                entryIds: pending
                    .filter((e) => e.employeeId === employeeId && e.weekStartDate === weekStart)
                    .map((e) => e.id),
                message: `${sample?.employeeName ?? 'Employee'} has ${total}h pending for week ${weekStart} (over ${WEEKLY_HOURS_WARNING}h).`,
                employeeName: sample?.employeeName,
            });
        }
    }

    const narrative =
        pending.length === 0
            ? 'No submitted timesheets pending approval.'
            : anomalies.length === 0
              ? `${pending.length} entry(ies) pending; no anomalies detected by rule checks.`
              : `${pending.length} entry(ies) pending; ${anomalies.length} anomaly alert(s) require review.`;

    return {
        totalPending: pending.length,
        anomalyCount: anomalies.length,
        anomalies,
        narrative,
    };
}
