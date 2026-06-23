export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AllocationRiskType = 'no_assigned_members' | 'inactive_allocation';

export type CapacityRiskType = 'zero_planned_hours' | 'under_allocation' | 'over_allocation';

export interface AllocationRiskFinding {
    type: AllocationRiskType;
    message: string;
    severity: RiskLevel;
}

export interface CapacityRiskFinding {
    type: CapacityRiskType;
    message: string;
    severity: RiskLevel;
    memberCount?: number;
    plannedHours?: number;
    allocationPercent?: number;
}

export interface SkillForecastFinding {
    domain: string;
    message: string;
    gapHeadcount: number;
}

export interface DeliveryRiskItem {
    projectId: string;
    name: string;
    code: string;
    level: RiskLevel;
    score: number;
    category: 'Current Delivery Risk';
    allocationRisks: AllocationRiskFinding[];
    capacityRisks: CapacityRiskFinding[];
    reasons: string[];
    recommendations: string[];
}

export interface SkillGapForecastItem {
    projectId: string;
    name: string;
    code: string;
    category: 'Future Capability Gap';
    level: RiskLevel;
    forecasts: SkillForecastFinding[];
}

export interface ProjectRiskIntelligence {
    projectId: string;
    name: string;
    code: string;
    deliveryRisk: Omit<DeliveryRiskItem, 'projectId' | 'name' | 'code' | 'category'>;
    skillGapForecast: Omit<SkillGapForecastItem, 'projectId' | 'name' | 'code' | 'category'> | null;
}

export interface RaidSuggestion {
    id: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    riskSource: 'allocation' | 'capacity';
    title: string;
    description: string;
    recommendedAction: string;
    priority: 'Low' | 'Medium' | 'High';
    severity: RiskLevel;
}

export interface PortfolioRiskSummary {
    deliveryRisks: DeliveryRiskItem[];
    skillGapForecasts: SkillGapForecastItem[];
    raidSuggestions: RaidSuggestion[];
}
