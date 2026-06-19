import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

export interface AllocationSuggestion {
    weekStart: string;
    weekLabel: string;
    type: 'SHORTAGE' | 'OVERLOAD' | 'REDISTRIBUTE';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    projectId?: string;
    projectName?: string;
}

const severityStyles = {
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    critical: 'bg-red-50 text-red-800 border-red-200',
};

interface AllocationSuggestionsPanelProps {
    weekStartFrom: string;
    weekStartTo: string;
}

export function AllocationSuggestionsPanel({
    weekStartFrom,
    weekStartTo,
}: AllocationSuggestionsPanelProps) {
    const [suggestions, setSuggestions] = useState<AllocationSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = new URLSearchParams({ weekStartFrom, weekStartTo });
        api
            .get<AllocationSuggestion[]>(`/ai/allocation-suggestions?${q}`)
            .then(setSuggestions)
            .catch(() => setSuggestions([]))
            .finally(() => setLoading(false));
    }, [weekStartFrom, weekStartTo]);

    if (loading) {
        return (
            <Card className="border-gray-200">
                <CardContent className="py-8 text-center text-sm text-gray-500">Loading suggestions…</CardContent>
            </Card>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <Card className="border-brand-100 bg-brand-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Weekly allocation suggestions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {suggestions.slice(0, 8).map((s, i) => (
                    <div
                        key={`${s.weekStart}-${s.type}-${i}`}
                        className="flex flex-wrap items-start gap-2 text-xs rounded-lg border border-gray-100 bg-white px-3 py-2"
                    >
                        <Badge variant="outline" className="text-[10px] shrink-0">
                            {s.weekLabel}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${severityStyles[s.severity]}`}>
                            {s.type}
                        </Badge>
                        <span className="text-gray-700 leading-snug">{s.message}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
