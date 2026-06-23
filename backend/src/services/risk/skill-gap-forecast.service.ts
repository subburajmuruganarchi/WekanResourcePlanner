import { projectService } from '../../modules/projects/project.service';
import type { RiskLevel, SkillForecastFinding } from './risk-intelligence.types';

const SKILL_DOMAIN_PATTERNS: { pattern: RegExp; domain: string; capacityLabel: string }[] = [
    { pattern: /react\s*native|mobile|ios|android|flutter/i, domain: 'mobile', capacityLabel: 'mobile' },
    { pattern: /react|frontend|angular|vue|ui|ux/i, domain: 'frontend', capacityLabel: 'frontend' },
    { pattern: /node|backend|java|\.net|python|api|spring/i, domain: 'backend', capacityLabel: 'backend' },
    { pattern: /qa|test|quality|automation/i, domain: 'qa', capacityLabel: 'QA' },
    { pattern: /devops|cloud|aws|azure|kubernetes|docker/i, domain: 'platform', capacityLabel: 'platform' },
    { pattern: /data|analytics|ml|ai|machine/i, domain: 'data', capacityLabel: 'data' },
];

function domainForSkill(skillName: string): { domain: string; capacityLabel: string } {
    for (const row of SKILL_DOMAIN_PATTERNS) {
        if (row.pattern.test(skillName)) {
            return { domain: row.domain, capacityLabel: row.capacityLabel };
        }
    }
    return { domain: skillName.toLowerCase().slice(0, 24), capacityLabel: skillName.toLowerCase() };
}

function forecastLevel(findings: SkillForecastFinding[]): RiskLevel {
    const totalGap = findings.reduce((s, f) => s + f.gapHeadcount, 0);
    if (totalGap >= 3) return 'HIGH';
    if (totalGap >= 1) return 'MEDIUM';
    return 'LOW';
}

/**
 * Skill gap forecast — future planning only.
 * Uses Project sheet requirements + employee skills; never treated as current delivery risk.
 */
export async function assessSkillGapForecast(projectId: string): Promise<{
    forecasts: SkillForecastFinding[];
    level: RiskLevel;
} | null> {
    const project = await projectService.findById(projectId);
    if (!project) return null;

    const skillReqs = project.skillRequirements ?? [];
    const roleEfforts = project.roleEfforts ?? [];

    const forecasts: SkillForecastFinding[] = [];

    for (const req of skillReqs) {
        const gap = Math.max(0, req.remainingHeadcount ?? 0);
        if (gap <= 0) continue;
        const skillName = req.skillName || 'specialist';
        const { domain, capacityLabel } = domainForSkill(skillName);
        forecasts.push({
            domain,
            message: `Future delivery may need additional ${capacityLabel} capacity based on the project plan.`,
            gapHeadcount: gap,
        });
    }

    for (const role of roleEfforts) {
        const gap = Math.max(0, role.remainingHeadcount ?? 0);
        if (gap <= 0) continue;
        const roleName = role.roleName || 'role';
        const { domain, capacityLabel } = domainForSkill(roleName);
        forecasts.push({
            domain: `role-${domain}`,
            message: `Project plan indicates potential future need for ${capacityLabel} capacity (${gap} slot${gap > 1 ? 's' : ''}).`,
            gapHeadcount: gap,
        });
    }

    const deduped = [...new Map(forecasts.map((f) => [f.message, f])).values()];
    if (deduped.length === 0) return null;

    return { forecasts: deduped.slice(0, 8), level: forecastLevel(deduped) };
}
