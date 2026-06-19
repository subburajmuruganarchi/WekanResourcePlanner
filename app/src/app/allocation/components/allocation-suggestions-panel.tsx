import { useEffect, useMemo, useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

export interface AllocationRoleWeekSuggestion {
    weekStart: string;
    weekLabel: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    roleName: string;
    skillName?: string;
    headcountGap: number;
    recommendedHours: number;
    plannedHours: number;
    hoursToPlan: number;
    status: 'missing' | 'partial' | 'filled' | 'overload';
    message: string;
}

export interface AllocationSuggestionsResponse {
    weekStartFrom: string;
    weekStartTo: string;
    items: AllocationRoleWeekSuggestion[];
    summary: {
        roleGaps: number;
        projectsAffected: number;
        weeksAffected: number;
    };
}

const statusStyles: Record<string, string> = {
    missing: 'bg-red-50 text-red-800 border-red-200',
    partial: 'bg-amber-50 text-amber-900 border-amber-200',
    overload: 'bg-orange-50 text-orange-900 border-orange-200',
    filled: 'bg-green-50 text-green-800 border-green-200',
};

interface AllocationSuggestionsPanelProps {
    weekStartFrom: string;
    weekStartTo: string;
}

export function AllocationSuggestionsPanel({
    weekStartFrom,
    weekStartTo,
}: AllocationSuggestionsPanelProps) {
    const [data, setData] = useState<AllocationSuggestionsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = new URLSearchParams({ weekStartFrom, weekStartTo });
        api
            .get<AllocationSuggestionsResponse>(`/ai/allocation-suggestions?${q}`)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [weekStartFrom, weekStartTo]);

    const planningItems = useMemo(
        () => (data?.items ?? []).filter((i) => i.status !== 'overload'),
        [data]
    );
    const overloadItems = useMemo(
        () => (data?.items ?? []).filter((i) => i.status === 'overload'),
        [data]
    );

    if (loading) {
        return (
            <Card className="border-gray-200">
                <CardContent className="py-8 text-center text-sm text-gray-500">
                    Loading role planning suggestions…
                </CardContent>
            </Card>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <Card className="border-gray-200 bg-gray-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-600" />
                        Weekly role planning guide
                    </CardTitle>
                    <CardDescription className="text-xs">
                        No gaps detected — project role targets appear met for the visible horizon, or
                        projects have no role requirements defined yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-brand-100">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Weekly role planning guide
                </CardTitle>
                <CardDescription className="text-xs text-gray-600">
                    Per project and week: which role to staff, target hours, what is already planned, and
                    remaining hours to allocate. Based on project role efforts and skill requirements.
                </CardDescription>
                {data.summary.roleGaps > 0 && (
                    <p className="text-xs text-gray-500 pt-1">
                        {data.summary.roleGaps} role gap
                        {data.summary.roleGaps === 1 ? '' : 's'} across {data.summary.projectsAffected}{' '}
                        project{data.summary.projectsAffected === 1 ? '' : 's'} ·{' '}
                        {data.summary.weeksAffected} week{data.summary.weeksAffected === 1 ? '' : 's'}
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {planningItems.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-xs border-collapse">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="text-left font-semibold px-3 py-2 border-b">Week</th>
                                    <th className="text-left font-semibold px-3 py-2 border-b">Project</th>
                                    <th className="text-left font-semibold px-3 py-2 border-b">Role</th>
                                    <th className="text-right font-semibold px-3 py-2 border-b">Target h</th>
                                    <th className="text-right font-semibold px-3 py-2 border-b">Planned h</th>
                                    <th className="text-right font-semibold px-3 py-2 border-b">Plan h</th>
                                    <th className="text-left font-semibold px-3 py-2 border-b">Gap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {planningItems.slice(0, 20).map((row) => (
                                    <tr key={`${row.weekStart}-${row.projectId}-${row.roleName}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                                        <td className="px-3 py-2 whitespace-nowrap font-medium">{row.weekLabel}</td>
                                        <td className="px-3 py-2 min-w-[140px]">
                                            <span className="font-medium text-gray-900 block">{row.projectName}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{row.projectCode}</span>
                                        </td>
                                        <td className="px-3 py-2 min-w-[120px]">
                                            <span className="font-medium">{row.roleName}</span>
                                            {row.skillName && (
                                                <span className="block text-[10px] text-gray-500">{row.skillName}</span>
                                            )}
                                            {row.headcountGap > 0 && (
                                                <span className="block text-[10px] text-amber-700">
                                                    {row.headcountGap} headcount gap
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{row.recommendedHours}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">{row.plannedHours}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-brand-700">
                                            {row.hoursToPlan}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={`text-[10px] ${statusStyles[row.status]}`}>
                                                {row.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {overloadItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                            Capacity warnings
                        </p>
                        {overloadItems.slice(0, 5).map((row, i) => (
                            <p key={i} className="text-xs text-orange-900 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                                <strong>{row.weekLabel}:</strong> {row.message}
                            </p>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
