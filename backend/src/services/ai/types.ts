export interface DashboardStatsSnapshot {
    activeProjects: number;
    totalEmployees: number;
    avgUtilization: number;
    plannedHours: number;
    hoursThisWeek: number;
    pendingApprovals: number;
    approvedHours: number;
    planDeliveryPercent: number;
    rejectedHours: number;
}

export interface DashboardInsight {
    narrative: string;
    bullets: string[];
    metrics: DashboardStatsSnapshot;
}

export interface AllocationExplanation {
    employeeId: string;
    employeeName: string;
    rankPosition: number;
    matchScore: number;
    confidencePercent: number;
    summary: string;
    factors: {
        skillMatch: boolean;
        skillContribution: string;
        availabilityPercent: number;
        experienceYears: number;
        utilizationNote: string;
    };
    skillGaps: string[];
}

export type StaffingRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StaffingRiskAssessment {
    projectId: string;
    level: StaffingRiskLevel;
    score: number;
    reasons: string[];
    category?: 'Current Delivery Risk';
    allocationRisks?: {
        type: string;
        message: string;
        severity: StaffingRiskLevel;
    }[];
    capacityRisks?: {
        type: string;
        message: string;
        severity: StaffingRiskLevel;
        memberCount?: number;
    }[];
    recommendations?: string[];
    missingSkillSlots: number;
    unfulfilledHeadcount: number;
    /** @deprecated Use capacityRisks / recommendations — never shown as current delivery risk */
    requiredSkills: {
        skill: string;
        minLevel: string;
        headcount: number;
        filled: number;
        gap: number;
    }[];
    /** @deprecated Use capacityRisks / recommendations */
    requiredRoles: {
        role: string;
        effortHours: number;
        headcount: number;
        gap: number;
    }[];
    suggestedRoles: string[];
}

export interface ApprovalAnomaly {
    severity: 'warning' | 'critical';
    type: 'unusual_hours' | 'duplicate_entry' | 'weekend_work' | 'weekly_overtime';
    entryIds: string[];
    message: string;
    employeeName?: string;
    projectName?: string;
}

export interface ApprovalInsightSummary {
    totalPending: number;
    anomalyCount: number;
    anomalies: ApprovalAnomaly[];
    narrative: string;
}

export interface TimeEntrySuggestionDay {
    date: string;
    suggestedHours: number;
    source: 'forecast' | 'last_week' | 'pattern';
}

export interface TimeEntrySuggestions {
    employeeId: string;
    weekStart: string;
    days: TimeEntrySuggestionDay[];
    narrative: string;
    lastWeekTotalHours: number;
}
