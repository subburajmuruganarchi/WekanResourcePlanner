import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import type { AllocationRiskFinding, RiskLevel } from './risk-intelligence.types';

function maxSeverity(findings: AllocationRiskFinding[]): RiskLevel {
    if (findings.some((f) => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
}

/**
 * Allocation risk — source of truth: Project_Allocation only.
 * Never uses Project sheet role/skill requirements.
 */
export async function assessAllocationRisk(projectId: string): Promise<{
    findings: AllocationRiskFinding[];
    level: RiskLevel;
}> {
    const findings: AllocationRiskFinding[] = [];
    const oid = new Types.ObjectId(projectId);

    const allAllocations = await ProjectAllocation.find({ project_id: oid }).lean();
    const activeAllocations = allAllocations.filter((a) => a.is_active);

    if (allAllocations.length === 0) {
        findings.push({
            type: 'no_assigned_members',
            message: 'No team members assigned in Project_Allocation.',
            severity: 'HIGH',
        });
    } else if (activeAllocations.length === 0) {
        findings.push({
            type: 'inactive_allocation',
            message: 'Project has allocation records but none are active.',
            severity: 'HIGH',
        });
    }

    return { findings, level: maxSeverity(findings) };
}
