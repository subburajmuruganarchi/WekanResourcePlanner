import type { Project } from '@/types/api';
import type { DeliveryRiskItem } from '@/lib/risk-intelligence';
import { projectCustomerLabel } from '@/lib/project-customer-label';
import { isOperationalProject } from '@/lib/project-status';

export type PortfolioHealth = 'Green' | 'Amber' | 'Red';

export interface PortfolioHealthRow {
    projectId: string;
    projectName: string;
    projectCode: string;
    health: PortfolioHealth;
    progress: number;
    confidence: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    owner: string;
}

function healthFromRisk(level?: string, score?: number): PortfolioHealth {
    if (level === 'HIGH' || (score ?? 0) >= 55) return 'Red';
    if (level === 'MEDIUM' || (score ?? 0) >= 25) return 'Amber';
    return 'Green';
}

function confidenceFromHealth(health: PortfolioHealth, progress: number): number {
    const base = health === 'Green' ? 88 : health === 'Amber' ? 68 : 52;
    return Math.min(99, Math.max(40, Math.round((base + progress) / 2)));
}

/** Build portfolio health rows — project name is the customer label. */
export function buildPortfolioHealthRows(
    projects: Project[],
    risks: DeliveryRiskItem[],
    options?: { activeOnly?: boolean }
): PortfolioHealthRow[] {
    const activeOnly = options?.activeOnly !== false;
    const list = activeOnly
        ? projects.filter((p) => isOperationalProject(p))
        : projects;

    return list.map((p) => {
        const risk = risks.find((r) => r.projectId === p.id);
        const health = healthFromRisk(risk?.level, risk?.score);
        const progress = risk ? Math.max(35, 100 - risk.score) : 85;
        return {
            projectId: p.id,
            projectName: projectCustomerLabel(p),
            projectCode: p.code,
            health,
            progress,
            confidence: confidenceFromHealth(health, progress),
            riskLevel: health === 'Red' ? 'High' : health === 'Amber' ? 'Medium' : 'Low',
            owner: p.managerName || '—',
        };
    });
}

export interface ProjectDeliveryCard {
    projectId: string;
    projectName: string;
    health: PortfolioHealth;
    upcomingMilestone: string;
    escalations: number;
}

export function buildProjectDeliveryCards(rows: PortfolioHealthRow[]): ProjectDeliveryCard[] {
    return rows.map((row) => ({
        projectId: row.projectId,
        projectName: row.projectName,
        health: row.health,
        upcomingMilestone: 'Next release window',
        escalations: row.health === 'Red' ? 1 : 0,
    }));
}
