import { assessProjectDeliveryRisk, assessProjectRiskIntelligence } from '../risk/risk-intelligence.service';
import type { StaffingRiskAssessment, StaffingRiskLevel } from './types';

/** Legacy API shape — maps to Current Delivery Risk only (never skill-gap forecast). */
export async function assessStaffingRisk(projectId: string): Promise<StaffingRiskAssessment> {
    const intelligence = await assessProjectRiskIntelligence(projectId);
    if (!intelligence) {
        throw new Error('Project not found');
    }

    const delivery = intelligence.deliveryRisk;

    return {
        projectId,
        level: delivery.level as StaffingRiskLevel,
        score: delivery.score,
        reasons: delivery.reasons,
        category: 'Current Delivery Risk',
        allocationRisks: delivery.allocationRisks,
        capacityRisks: delivery.capacityRisks,
        recommendations: delivery.recommendations,
        missingSkillSlots: 0,
        unfulfilledHeadcount: delivery.capacityRisks.find((c) => c.type === 'zero_planned_hours')?.memberCount ?? 0,
        requiredSkills: [],
        requiredRoles: [],
        suggestedRoles: delivery.recommendations.slice(0, 6),
    };
}

export { assessProjectDeliveryRisk, assessProjectRiskIntelligence };
