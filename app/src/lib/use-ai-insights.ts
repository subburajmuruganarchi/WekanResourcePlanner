import { useCallback, useState } from 'react';
import { api } from './api-client';

export interface DashboardInsight {
    narrative: string;
    bullets: string[];
    metrics: Record<string, number>;
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

export interface StaffingRiskAssessment {
    projectId: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    reasons: string[];
}

export interface ApprovalInsightSummary {
    totalPending: number;
    anomalyCount: number;
    anomalies: {
        severity: string;
        type: string;
        entryIds: string[];
        message: string;
    }[];
    narrative: string;
}

export interface TimeEntrySuggestions {
    narrative: string;
    days: { date: string; suggestedHours: number; source: string }[];
    lastWeekTotalHours: number;
}

export function useDashboardInsight() {
    const [insight, setInsight] = useState<DashboardInsight | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchInsight = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<DashboardInsight>('/ai/dashboard-summary');
            setInsight(data);
        } catch {
            setInsight(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { insight, loading, fetchInsight };
}

export async function fetchAllocationExplanation(
    projectId: string,
    employeeId: string,
    startDate?: string,
    endDate?: string
): Promise<AllocationExplanation | null> {
    const q = new URLSearchParams({ projectId, employeeId });
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    try {
        return await api.get<AllocationExplanation>(`/ai/allocation/explain?${q}`);
    } catch {
        return null;
    }
}

export async function fetchStaffingRisk(projectId: string): Promise<StaffingRiskAssessment | null> {
    try {
        return await api.get<StaffingRiskAssessment>(`/ai/staffing-risk/${projectId}`);
    } catch {
        return null;
    }
}

export async function fetchApprovalAnomalies(): Promise<ApprovalInsightSummary | null> {
    try {
        return await api.get<ApprovalInsightSummary>('/ai/approval-anomalies');
    } catch {
        return null;
    }
}

export async function fetchTimeEntrySuggestions(
    employeeId: string,
    week: string
): Promise<TimeEntrySuggestions | null> {
    try {
        return await api.get<TimeEntrySuggestions>(
            `/ai/time-entry-suggestions?employeeId=${employeeId}&week=${week}`
        );
    } catch {
        return null;
    }
}
