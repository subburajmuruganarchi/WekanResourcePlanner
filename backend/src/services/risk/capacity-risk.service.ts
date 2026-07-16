import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { endOfUtcWeek, startOfUtcWeek } from '../../common/utils/week.util';
import { features } from '../../config/features';
import type { CapacityRiskFinding, RiskLevel } from './risk-intelligence.types';

function maxSeverity(findings: CapacityRiskFinding[]): RiskLevel {
    if (findings.some((f) => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
}

/**
 * Capacity risk — source: WeeklyAllocationEntry (current UTC week) + active Project_Allocation.
 * Week bounds use the same startOfUtcWeek helper as planner saves so planned hours match.
 */
export async function assessCapacityRisk(projectId: string): Promise<{
    findings: CapacityRiskFinding[];
    level: RiskLevel;
}> {
    const findings: CapacityRiskFinding[] = [];
    const oid = new Types.ObjectId(projectId);
    const weekStart = startOfUtcWeek(new Date());
    const weekEnd = endOfUtcWeek(weekStart);
    const capacity = features.weeklyCapacityHours;

    const [activeAllocations, weekEntries] = await Promise.all([
        ProjectAllocation.find({
            project_id: oid,
            is_active: true,
        }).lean(),
        WeeklyAllocationEntry.find({
            project_id: oid,
            week_start: { $gte: weekStart, $lte: weekEnd },
        }).lean(),
    ]);

    const plannedByEmployee = new Map<string, number>();
    for (const entry of weekEntries) {
        const id = entry.employee_id.toString();
        plannedByEmployee.set(id, (plannedByEmployee.get(id) ?? 0) + (entry.planned_hours ?? 0));
    }

    // Staff set: active Project_Allocation members, or anyone with planner hours this week.
    const staffIds = new Set<string>([
        ...activeAllocations.map((a) => a.employee_id.toString()),
        ...[...plannedByEmployee.keys()].filter((id) => (plannedByEmployee.get(id) ?? 0) > 0),
    ]);

    if (staffIds.size === 0) {
        return { findings, level: 'LOW' };
    }

    let zeroHourMembers = 0;
    for (const id of staffIds) {
        // Only flag Project_Allocation members with no planner hours (not pure planner-only rows).
        const onAllocation = activeAllocations.some((a) => a.employee_id.toString() === id);
        if (!onAllocation) continue;
        const planned = plannedByEmployee.get(id) ?? 0;
        if (planned <= 0) zeroHourMembers++;
    }

    if (zeroHourMembers > 0) {
        findings.push({
            type: 'zero_planned_hours',
            message: `${zeroHourMembers} allocated member(s) have no planned hours for the current week.`,
            severity: zeroHourMembers >= 2 ? 'HIGH' : 'MEDIUM',
            memberCount: zeroHourMembers,
            plannedHours: 0,
        });
    }

    const expectedHours =
        activeAllocations.length > 0
            ? activeAllocations.reduce(
                  (sum, a) => sum + ((a.allocation_percent ?? 0) / 100) * capacity,
                  0
              )
            : 0;
    const actualPlanned = weekEntries.reduce((sum, e) => sum + (e.planned_hours ?? 0), 0);

    if (expectedHours > 0 && actualPlanned < expectedHours * 0.4) {
        findings.push({
            type: 'under_allocation',
            message: `Current-week planned hours (${Math.round(actualPlanned)}h) are below expected capacity (${Math.round(expectedHours)}h).`,
            severity: actualPlanned < expectedHours * 0.2 ? 'HIGH' : 'MEDIUM',
            plannedHours: Math.round(actualPlanned),
            allocationPercent: Math.round((actualPlanned / expectedHours) * 100),
        });
    }

    const employeeIds = [...staffIds];
    const orgWeekEntries = await WeeklyAllocationEntry.find({
        employee_id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) },
        week_start: { $gte: weekStart, $lte: weekEnd },
    }).lean();

    const orgPlannedByEmployee = new Map<string, number>();
    for (const entry of orgWeekEntries) {
        const id = entry.employee_id.toString();
        orgPlannedByEmployee.set(id, (orgPlannedByEmployee.get(id) ?? 0) + (entry.planned_hours ?? 0));
    }

    let overPlannedMembers = 0;
    for (const employeeId of employeeIds) {
        const totalPlanned = orgPlannedByEmployee.get(employeeId) ?? 0;
        if (totalPlanned > capacity) overPlannedMembers++;
    }

    if (overPlannedMembers > 0) {
        findings.push({
            type: 'over_allocation',
            message: `${overPlannedMembers} team member(s) have weekly planned hours above ${capacity}h capacity.`,
            severity: 'HIGH',
            memberCount: overPlannedMembers,
        });
    }

    return { findings, level: maxSeverity(findings) };
}
