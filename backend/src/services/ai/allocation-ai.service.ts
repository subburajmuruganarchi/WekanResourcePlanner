import { allocationService } from '../../modules/allocations/allocation.service';
import { AllocationExplanation } from './types';

/**
 * Explain ranking for one employee using existing calculateRanking output.
 * Does not modify scores.
 */
export async function explainAllocationRank(params: {
    projectId: string;
    employeeId: string;
    startDate?: string;
    endDate?: string;
}): Promise<AllocationExplanation | null> {
    const ranked = await allocationService.rankEmployees({
        projectId: params.projectId,
        startDate: params.startDate,
        endDate: params.endDate,
    });

    const index = ranked.findIndex((e) => e.id === params.employeeId);
    if (index < 0) return null;

    const emp = ranked[index];
    const scorePercent = Math.round((emp.matchScore ?? 0) * 100);
    const availabilityPct = emp.availability ?? 0;
    const expScore = Math.round((emp.factors?.experienceScore ?? 0) * 100);

    const skillPart = emp.factors?.skillMatch
        ? `Skill requirements match (${emp.matchingSkills?.map((s) => `${s.name} (${s.level})`).join(', ') || emp.primarySkill}).`
        : `Partial skill alignment; primary skill ${emp.primarySkill} (${emp.skillLevel}).`;

    const utilNote =
        availabilityPct >= 80
            ? 'High availability for new allocation.'
            : availabilityPct > 0
              ? 'Limited availability due to existing allocations.'
              : 'Fully allocated — no remaining bandwidth.';

    const summary =
        `${emp.name} ranks #${index + 1} with match score ${scorePercent}% ` +
        `(skill fit, ${availabilityPct}% availability, ${emp.experienceYears} yrs experience). ` +
        skillPart;

    const skillGaps: string[] = [];
    if (!emp.factors?.skillMatch) {
        skillGaps.push('Does not fully satisfy project skill requirements.');
    }
    if (availabilityPct < 50) {
        skillGaps.push('Low availability may delay staffing.');
    }

    return {
        employeeId: emp.id,
        employeeName: emp.name,
        rankPosition: index + 1,
        matchScore: emp.matchScore,
        confidencePercent: scorePercent,
        summary,
        factors: {
            skillMatch: !!emp.factors?.skillMatch,
            skillContribution: skillPart,
            availabilityPercent: availabilityPct,
            experienceYears: emp.experienceYears,
            utilizationNote: `${utilNote} Experience factor: ${expScore}%.`,
        },
        skillGaps,
    };
}
