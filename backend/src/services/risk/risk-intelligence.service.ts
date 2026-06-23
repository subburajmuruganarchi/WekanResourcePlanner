import { Types } from 'mongoose';
import { Project } from '../../modules/projects/project.model';
import { activeDashboardProjectFilter } from '../../modules/dashboard/dashboard-metrics.service';
import type { DashboardScopeFilter } from '../../modules/dashboard/dashboard-metrics.service';
import { assessAllocationRisk } from './allocation-risk.service';
import { assessCapacityRisk } from './capacity-risk.service';
import { assessSkillGapForecast } from './skill-gap-forecast.service';
import type {
    DeliveryRiskItem,
    ProjectRiskIntelligence,
    RaidSuggestion,
    RiskLevel,
    SkillGapForecastItem,
} from './risk-intelligence.types';

function scoreDeliveryRisk(
    allocationLevel: RiskLevel,
    capacityLevel: RiskLevel,
    allocationCount: number,
    capacityCount: number
): number {
    let score = 0;
    if (allocationLevel === 'HIGH') score += 45;
    else if (allocationLevel === 'MEDIUM') score += 22;
    if (capacityLevel === 'HIGH') score += 40;
    else if (capacityLevel === 'MEDIUM') score += 20;
    score += Math.min(15, allocationCount * 5 + capacityCount * 4);
    return Math.min(100, score);
}

function combineLevel(score: number): RiskLevel {
    if (score >= 55) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
}

function buildRecommendations(
    allocationFindings: { message: string }[],
    capacityFindings: { message: string }[]
): string[] {
    const recs: string[] = [];
    for (const f of allocationFindings) {
        if (f.message.includes('No team members')) {
            recs.push('Assign members in Project_Allocation for this project.');
        } else if (f.message.includes('none are active')) {
            recs.push('Reactivate allocation rows in Project_Allocation or assign new members.');
        }
    }
    for (const f of capacityFindings) {
        if (f.message.includes('no planned hours')) {
            recs.push('Add current-week planned hours in the resource planner for allocated members.');
        } else if (f.message.includes('below expected capacity')) {
            recs.push('Increase current-week planned hours to match committed allocation levels.');
        } else if (f.message.includes('over-allocated')) {
            recs.push('Rebalance portfolio allocations to bring affected members below 100% capacity.');
        }
    }
    return recs.slice(0, 4);
}

export async function assessProjectDeliveryRisk(
    projectId: string,
    projectMeta?: { name: string; code: string }
): Promise<DeliveryRiskItem | null> {
    let name = projectMeta?.name ?? '';
    let code = projectMeta?.code ?? '';

    if (!name || !code) {
        const proj = await Project.findById(projectId).select('project_name project_code').lean();
        if (!proj) return null;
        name = proj.project_name;
        code = proj.project_code;
    }

    const [allocation, capacity] = await Promise.all([
        assessAllocationRisk(projectId),
        assessCapacityRisk(projectId),
    ]);

    const reasons = [...allocation.findings, ...capacity.findings].map((f) => f.message);
    const score = scoreDeliveryRisk(
        allocation.level,
        capacity.level,
        allocation.findings.length,
        capacity.findings.length
    );
    const level = combineLevel(score);

    if (level === 'LOW' && reasons.length === 0) {
        reasons.push('Current-week allocation and planner coverage appear operational.');
    }

    return {
        projectId,
        name,
        code,
        level,
        score,
        category: 'Current Delivery Risk',
        allocationRisks: allocation.findings,
        capacityRisks: capacity.findings,
        reasons,
        recommendations: buildRecommendations(allocation.findings, capacity.findings),
    };
}

export async function assessProjectSkillGapForecast(
    projectId: string,
    projectMeta?: { name: string; code: string }
): Promise<SkillGapForecastItem | null> {
    const forecast = await assessSkillGapForecast(projectId);
    if (!forecast || forecast.forecasts.length === 0) return null;

    let name = projectMeta?.name ?? '';
    let code = projectMeta?.code ?? '';
    if (!name || !code) {
        const proj = await Project.findById(projectId).select('project_name project_code').lean();
        if (!proj) return null;
        name = proj.project_name;
        code = proj.project_code;
    }

    return {
        projectId,
        name,
        code,
        category: 'Future Capability Gap',
        level: forecast.level,
        forecasts: forecast.forecasts,
    };
}

export async function assessProjectRiskIntelligence(projectId: string): Promise<ProjectRiskIntelligence | null> {
    const proj = await Project.findById(projectId).select('project_name project_code').lean();
    if (!proj) return null;

    const meta = { name: proj.project_name, code: proj.project_code };
    const [delivery, skillGap] = await Promise.all([
        assessProjectDeliveryRisk(projectId, meta),
        assessProjectSkillGapForecast(projectId, meta),
    ]);

    if (!delivery) return null;

    const { projectId: _p, name, code, category: _c, ...deliveryBody } = delivery;
    const skillBody = skillGap
        ? (({ projectId: _sp, name: _sn, code: _sc, category: _scat, ...rest }) => rest)(skillGap)
        : null;

    return {
        projectId,
        name,
        code,
        deliveryRisk: deliveryBody,
        skillGapForecast: skillBody,
    };
}

async function scopedActiveProjects(scope?: DashboardScopeFilter) {
    const query: Record<string, unknown> = { ...activeDashboardProjectFilter() };
    if (scope?.projectIds?.length) {
        query._id = { $in: scope.projectIds.map((id) => new Types.ObjectId(id)) };
    }
    return Project.find(query).select('_id project_name project_code').lean();
}

export async function buildDeliveryRiskSummary(
    limit = 12,
    scope?: DashboardScopeFilter
): Promise<DeliveryRiskItem[]> {
    const projects = await scopedActiveProjects(scope);
    const assessed = await Promise.all(
        projects.map((p) =>
            assessProjectDeliveryRisk(p._id.toString(), {
                name: p.project_name,
                code: p.project_code,
            })
        )
    );

    return assessed
        .filter((r): r is DeliveryRiskItem => r !== null && r.level !== 'LOW')
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

export async function buildSkillGapForecastSummary(
    limit = 12,
    scope?: DashboardScopeFilter
): Promise<SkillGapForecastItem[]> {
    const projects = await scopedActiveProjects(scope);
    const forecasts = await Promise.all(
        projects.map((p) =>
            assessProjectSkillGapForecast(p._id.toString(), {
                name: p.project_name,
                code: p.project_code,
            })
        )
    );

    return forecasts
        .filter((f): f is SkillGapForecastItem => f !== null && f.forecasts.length > 0)
        .sort((a, b) => {
            const gapA = a.forecasts.reduce((s, x) => s + x.gapHeadcount, 0);
            const gapB = b.forecasts.reduce((s, x) => s + x.gapHeadcount, 0);
            return gapB - gapA;
        })
        .slice(0, limit);
}

export async function buildRaidSuggestions(
    limit = 10,
    scope?: DashboardScopeFilter
): Promise<RaidSuggestion[]> {
    const deliveryRisks = await buildDeliveryRiskSummary(50, scope);
    const suggestions: RaidSuggestion[] = [];

    for (const risk of deliveryRisks) {
        for (const finding of risk.allocationRisks) {
            suggestions.push({
                id: `alloc-${risk.projectId}-${finding.type}`,
                projectId: risk.projectId,
                projectName: risk.name,
                projectCode: risk.code,
                riskSource: 'allocation',
                title: finding.type === 'no_assigned_members' ? 'Unstaffed project' : 'Inactive project allocation',
                description: finding.message,
                recommendedAction:
                    risk.recommendations[0] ?? 'Review Project_Allocation and assign active members.',
                priority: finding.severity === 'HIGH' ? 'High' : 'Medium',
                severity: finding.severity,
            });
        }
        for (const finding of risk.capacityRisks) {
            const title =
                finding.type === 'zero_planned_hours'
                    ? 'Planner gap — zero hours this week'
                    : finding.type === 'under_allocation'
                      ? 'Under-planned capacity this week'
                      : 'Over-allocated team members';
            suggestions.push({
                id: `cap-${risk.projectId}-${finding.type}`,
                projectId: risk.projectId,
                projectName: risk.name,
                projectCode: risk.code,
                riskSource: 'capacity',
                title,
                description: finding.message,
                recommendedAction:
                    risk.recommendations.find((r) => r.toLowerCase().includes('planner') || r.toLowerCase().includes('rebalance')) ??
                    'Update the resource planner for the current week.',
                priority: finding.severity === 'HIGH' ? 'High' : 'Medium',
                severity: finding.severity,
            });
        }
    }

    return suggestions
        .sort((a, b) => {
            const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return order[a.severity] - order[b.severity];
        })
        .slice(0, limit);
}

/** @deprecated Use buildDeliveryRiskSummary — kept for legacy import paths */
export async function buildStaffingRiskSummary(limit = 6, scope?: DashboardScopeFilter) {
    const risks = await buildDeliveryRiskSummary(limit, scope);
    return risks.map((r) => ({
        projectId: r.projectId,
        name: r.name,
        code: r.code,
        level: r.level,
        score: r.score,
        reasons: r.reasons.slice(0, 3),
        category: r.category,
        allocationRisks: r.allocationRisks,
        capacityRisks: r.capacityRisks,
        recommendations: r.recommendations,
        unfulfilledHeadcount: r.capacityRisks.find((c) => c.type === 'zero_planned_hours')?.memberCount ?? 0,
    }));
}
