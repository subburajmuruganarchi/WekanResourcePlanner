import { useCallback, useEffect, useState } from 'react';
import {
    fetchDeliveryRisks,
    fetchRaidSuggestions,
    type DeliveryRiskItem,
    type RaidSuggestion,
    type RiskLevel,
} from '@/lib/risk-intelligence';

export interface DeliveryActionItem {
    id: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    title: string;
    description: string;
    recommendedAction: string;
    priority: 'Low' | 'Medium' | 'High';
    severity: RiskLevel;
    source: 'raid-suggestion' | 'delivery-risk';
}

function priorityFromSeverity(severity: RiskLevel): 'Low' | 'Medium' | 'High' {
    if (severity === 'HIGH') return 'High';
    if (severity === 'MEDIUM') return 'Medium';
    return 'Low';
}

function buildActionItems(
    suggestions: RaidSuggestion[],
    risks: DeliveryRiskItem[]
): DeliveryActionItem[] {
    const items: DeliveryActionItem[] = [];
    const seen = new Set<string>();

    for (const s of suggestions) {
        const id = `suggestion-${s.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        items.push({
            id,
            projectId: s.projectId,
            projectName: s.projectName,
            projectCode: s.projectCode,
            title: s.title,
            description: s.description,
            recommendedAction: s.recommendedAction,
            priority: s.priority,
            severity: s.severity,
            source: 'raid-suggestion',
        });
    }

    for (const risk of risks) {
        if (risk.level === 'LOW') continue;

        const reasons = risk.reasons?.length
            ? risk.reasons.join(' · ')
            : 'Review allocation and planner capacity for this project.';

        for (let i = 0; i < (risk.recommendations?.length ?? 0); i++) {
            const action = risk.recommendations![i];
            const id = `risk-${risk.projectId}-${i}`;
            if (seen.has(id)) continue;
            seen.add(id);
            items.push({
                id,
                projectId: risk.projectId,
                projectName: risk.name,
                projectCode: risk.code,
                title:
                    risk.level === 'HIGH'
                        ? 'High delivery risk — action required'
                        : 'Delivery risk — planner or allocation gap',
                description: reasons,
                recommendedAction: action,
                priority: priorityFromSeverity(risk.level),
                severity: risk.level,
                source: 'delivery-risk',
            });
        }

        if (!risk.recommendations?.length) {
            const id = `risk-${risk.projectId}-summary`;
            if (!seen.has(id)) {
                seen.add(id);
                items.push({
                    id,
                    projectId: risk.projectId,
                    projectName: risk.name,
                    projectCode: risk.code,
                    title:
                        risk.level === 'HIGH'
                            ? 'High delivery risk — action required'
                            : 'Delivery risk — planner or allocation gap',
                    description: reasons,
                    recommendedAction:
                        'Review Project_Allocation and current-week planner hours for allocated team members.',
                    priority: priorityFromSeverity(risk.level),
                    severity: risk.level,
                    source: 'delivery-risk',
                });
            }
        }
    }

    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return items.sort(
        (a, b) =>
            severityOrder[a.severity] - severityOrder[b.severity] ||
            a.projectName.localeCompare(b.projectName)
    );
}

export function useDeliveryRecommendations() {
    const [items, setItems] = useState<DeliveryActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [suggestions, risks] = await Promise.all([
                fetchRaidSuggestions(),
                fetchDeliveryRisks(),
            ]);
            setItems(buildActionItems(suggestions ?? [], risks ?? []));
        } catch {
            setItems([]);
            setError('Could not load delivery recommendations. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    return { items, loading, error, refetch: fetchData };
}
