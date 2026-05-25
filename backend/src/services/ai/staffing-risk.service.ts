import { Types } from 'mongoose';
import { projectService } from '../../modules/projects/project.service';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { StaffingRiskAssessment, StaffingRiskLevel } from './types';

/** Predictive staffing risk from requirements vs allocations — read-only. */
export async function assessStaffingRisk(projectId: string): Promise<StaffingRiskAssessment> {
    const project = await projectService.findById(projectId);
    if (!project) {
        throw new Error('Project not found');
    }

    const reasons: string[] = [];
    let score = 0;

    const skillReqs = project.skillRequirements || [];
    const unfulfilledHeadcount = skillReqs.reduce((s, r) => s + Math.max(0, r.remainingHeadcount ?? 0), 0);
    const missingSkillSlots = skillReqs.filter((r) => (r.remainingHeadcount ?? 0) > 0).length;

    if (missingSkillSlots > 0) {
        score += Math.min(40, missingSkillSlots * 15);
        reasons.push(`${missingSkillSlots} skill requirement slot(s) still need headcount.`);
    }
    if (unfulfilledHeadcount > 0) {
        score += Math.min(30, unfulfilledHeadcount * 10);
        reasons.push(`${unfulfilledHeadcount} open headcount across requirements.`);
    }

    const teamSize = project.teamSize ?? 0;
    const roleEfforts = project.roleEfforts || [];
    const roleGap = roleEfforts.reduce((s, r) => s + Math.max(0, r.remainingHeadcount ?? 0), 0);
    if (roleGap > 0) {
        score += 20;
        reasons.push(`${roleGap} role effort position(s) unfilled.`);
    }

    const allocations = await ProjectAllocation.find({
        project_id: new Types.ObjectId(projectId),
        is_active: true,
    }).lean();
    const allocatedPct = allocations.reduce((s, a) => s + (a.allocation_percent || 0), 0);
    if (teamSize === 0 && skillReqs.length > 0) {
        score += 25;
        reasons.push('No team allocated despite defined skill requirements.');
    } else if (allocatedPct < 50 && project.status === 'Active') {
        score += 15;
        reasons.push('Low total allocation percent on active project.');
    }

    if (reasons.length === 0) {
        reasons.push('Skill requirements and allocations appear balanced.');
    }

    let level: StaffingRiskLevel = 'LOW';
    if (score >= 55) level = 'HIGH';
    else if (score >= 25) level = 'MEDIUM';

    return {
        projectId,
        level,
        score: Math.min(100, score),
        reasons,
        missingSkillSlots,
        unfulfilledHeadcount,
    };
}
