import { Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AiInsightPanelProps {
    title?: string;
    narrative?: string;
    bullets?: string[];
    loading?: boolean;
    className?: string;
}

export function AiInsightPanel({
    title = 'AI Insights',
    narrative,
    bullets = [],
    loading,
    className = '',
}: AiInsightPanelProps) {
    return (
        <Card className={`p-5 border-blue-100 bg-gradient-to-br from-blue-50/80 to-white ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {loading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </div>
            {narrative && <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>}
            {bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-gray-600 list-disc pl-4">
                    {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                    ))}
                </ul>
            )}
            {!loading && !narrative && bullets.length === 0 && (
                <p className="text-sm text-gray-500">No insights available.</p>
            )}
        </Card>
    );
}
