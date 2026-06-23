import { api } from './api-client';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DeliveryRiskItem {
    projectId: string;
    name: string;
    code: string;
    level: RiskLevel;
    score: number;
    category: 'Current Delivery Risk';
    allocationRisks: { type: string; message: string; severity: RiskLevel }[];
    capacityRisks: {
        type: string;
        message: string;
        severity: RiskLevel;
        memberCount?: number;
        plannedHours?: number;
    }[];
    reasons: string[];
    recommendations: string[];
    unfulfilledHeadcount?: number;
}

export interface SkillGapForecastItem {
    projectId: string;
    name: string;
    code: string;
    category: 'Future Capability Gap';
    level: RiskLevel;
    forecasts: { domain: string; message: string; gapHeadcount: number }[];
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

/** @deprecated Use DeliveryRiskItem */
export type StaffingRiskItem = DeliveryRiskItem;

export function fetchDeliveryRisks() {
    return api.get<DeliveryRiskItem[]>('/dashboard/delivery-risks');
}

export function fetchSkillGapForecasts() {
    return api.get<SkillGapForecastItem[]>('/dashboard/skill-gap-forecast');
}

export function fetchRaidSuggestions() {
    return api.get<RaidSuggestion[]>('/dashboard/raid-suggestions');
}

/** Legacy alias */
export function fetchStaffingRisks() {
    return api.get<DeliveryRiskItem[]>('/dashboard/staffing-risks');
}

export function fetchProjectRiskIntelligence(projectId: string) {
    return api.get<{
        projectId: string;
        name: string;
        code: string;
        deliveryRisk: Omit<DeliveryRiskItem, 'projectId' | 'name' | 'code' | 'category'>;
        skillGapForecast: Omit<SkillGapForecastItem, 'projectId' | 'name' | 'code' | 'category'> | null;
    }>(`/ai/risk-intelligence/${projectId}`);
}
