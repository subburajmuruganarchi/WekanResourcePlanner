import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchProjectRiskIntelligence } from '@/lib/risk-intelligence';

const styles: Record<string, string> = {
    LOW: 'bg-green-50 text-green-700 border-green-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-red-50 text-red-700 border-red-200',
};

export function StaffingRiskBadge({ projectId }: { projectId: string }) {
    const [level, setLevel] = useState<string | null>(null);
    const [title, setTitle] = useState('');

    useEffect(() => {
        fetchProjectRiskIntelligence(projectId)
            .then((data) => {
                if (!data) return;
                setLevel(data.deliveryRisk.level);
                setTitle(data.deliveryRisk.reasons.join(' '));
            })
            .catch(() => {
                setLevel(null);
            });
    }, [projectId]);

    if (!level || level === 'LOW') return null;

    return (
        <Badge variant="outline" className={styles[level] ?? ''} title={title}>
            Current delivery risk: {level}
        </Badge>
    );
}
