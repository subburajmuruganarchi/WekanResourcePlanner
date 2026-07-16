import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { endOfUtcWeek, startOfUtcWeek } from '../../common/utils/week.util';
import type { AllocationRiskFinding, RiskLevel } from './risk-intelligence.types';

function maxSeverity(findings: AllocationRiskFinding[]): RiskLevel {
    if (findings.some((f) => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
}

/**
 * Allocation risk — Project_Allocation plus current-week planner staffing.
 * Planned hours in WeeklyAllocationEntry count as assigned (planner is source of truth for weeks).
 */
export async function assessAllocationRisk(projectId: string): Promise<{
    findings: AllocationRiskFinding[];
    level: RiskLevel;
}> {
    const findings: AllocationRiskFinding[] = [];
    const oid = new Types.ObjectId(projectId);
    const weekStart = startOfUtcWeek(new Date());
    const weekEnd = endOfUtcWeek(weekStart);

    const [allAllocations, weekPlannedEntries] = await Promise.all([
        ProjectAllocation.find({ project_id: oid }).lean(),
        WeeklyAllocationEntry.find({
            project_id: oid,
            week_start: { $gte: weekStart, $lte: weekEnd },
            planned_hours: { $gt: 0 },
        })
            .select('employee_id planned_hours')
            .lean(),
    ]);

    const activeAllocations = allAllocations.filter((a) => a.is_active);
    const plannerStaffed = weekPlannedEntries.length > 0;

    if (allAllocations.length === 0 && !plannerStaffed) {
        findings.push({
            type: 'no_assigned_members',
            message: 'No team members assigned in Project_Allocation and no planned hours for the current week.',
            severity: 'HIGH',
        });
    } else if (activeAllocations.length === 0 && !plannerStaffed) {
        findings.push({
            type: 'inactive_allocation',
            message: 'Project has allocation records but none are active, and no current-week planned hours.',
            severity: 'HIGH',
        });
    }

    return { findings, level: maxSeverity(findings) };
}
