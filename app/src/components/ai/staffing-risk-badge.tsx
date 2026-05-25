import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchStaffingRisk, type StaffingRiskAssessment } from '@/lib/use-ai-insights';

const styles: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
};

export function StaffingRiskBadge({ projectId }: { projectId: string }) {
    const [risk, setRisk] = useState<StaffingRiskAssessment | null>(null);

    useEffect(() => {
        fetchStaffingRisk(projectId).then(setRisk);
    }, [projectId]);

    if (!risk) return null;

    return (
        <Badge variant="outline" className={styles[risk.level] ?? ''} title={risk.reasons.join(' ')}>
            Staffing risk: {risk.level}
        </Badge>
    );
}
