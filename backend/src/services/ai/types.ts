export interface DashboardStatsSnapshot {
    activeProjects: number;
    totalEmployees: number;
    avgUtilization: number;
    hoursThisWeek: number;
    pendingApprovals: number;
    approvedHours: number;
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
    missingSkillSlots: number;
    unfulfilledHeadcount: number;
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
