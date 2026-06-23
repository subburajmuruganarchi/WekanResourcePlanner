import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { getCurrentUtcWeekBounds } from '../../modules/dashboard/dashboard-metrics.service';
import { features } from '../../config/features';
import type { CapacityRiskFinding, RiskLevel } from './risk-intelligence.types';

function maxSeverity(findings: CapacityRiskFinding[]): RiskLevel {
    if (findings.some((f) => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
}

/**
 * Capacity risk — source: WeeklyAllocationEntry (current week) + active Project_Allocation.
 */
export async function assessCapacityRisk(projectId: string): Promise<{
    findings: CapacityRiskFinding[];
    level: RiskLevel;
}> {
    const findings: CapacityRiskFinding[] = [];
    const oid = new Types.ObjectId(projectId);
    const { weekStart } = getCurrentUtcWeekBounds();
    const capacity = features.weeklyCapacityHours;

    const activeAllocations = await ProjectAllocation.find({
        project_id: oid,
        is_active: true,
    }).lean();

    if (activeAllocations.length === 0) {
        return { findings, level: 'LOW' };
    }

    const weekEntries = await WeeklyAllocationEntry.find({
        project_id: oid,
        week_start: weekStart,
    }).lean();

    const plannedByEmployee = new Map<string, number>();
    for (const entry of weekEntries) {
        const id = entry.employee_id.toString();
        plannedByEmployee.set(id, (plannedByEmployee.get(id) ?? 0) + (entry.planned_hours ?? 0));
    }

    let zeroHourMembers = 0;
    for (const alloc of activeAllocations) {
        const id = alloc.employee_id.toString();
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

    const expectedHours = activeAllocations.reduce(
        (sum, a) => sum + ((a.allocation_percent ?? 0) / 100) * capacity,
        0
    );
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

    const employeeIds = [...new Set(activeAllocations.map((a) => a.employee_id.toString()))];
    let overAllocatedMembers = 0;
    for (const employeeId of employeeIds) {
        const totalPct = await ProjectAllocation.aggregate([
            {
                $match: {
                    employee_id: new Types.ObjectId(employeeId),
                    is_active: true,
                },
            },
            { $group: { _id: null, total: { $sum: '$allocation_percent' } } },
        ]);
        const pct = totalPct[0]?.total ?? 0;
        if (pct > 100) overAllocatedMembers++;
    }

    if (overAllocatedMembers > 0) {
        findings.push({
            type: 'over_allocation',
            message: `${overAllocatedMembers} team member(s) are over-allocated above 100% capacity.`,
            severity: 'HIGH',
            memberCount: overAllocatedMembers,
        });
    }

    return { findings, level: maxSeverity(findings) };
}
