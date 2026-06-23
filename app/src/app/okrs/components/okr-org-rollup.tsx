import { useEffect, useState } from 'react';
import { Loader2, Target } from 'lucide-react';
import { api } from '@/lib/api';

interface OrgRollupGroup {
    department: string;
    employeeCount: number;
    okrCount: number;
    avgAchievement: number;
}

interface OrgRollupData {
    groups: OrgRollupGroup[];
    overallScore: number;
    totalOkrs: number;
}

interface OkrOrgRollupProps {
    period: string;
    readOnly?: boolean;
}

export function OkrOrgRollup({ period, readOnly = false }: OkrOrgRollupProps) {
    const [data, setData] = useState<OrgRollupData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const query = period ? `?period=${encodeURIComponent(period)}` : '';
        api.get(`/okrs/org-rollup${query}`)
            .then((res) => {
                const payload = (res as { data?: { data?: OrgRollupData } }).data?.data;
                setData(payload ?? null);
            })
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [period]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading org rollup…
            </div>
        );
    }

    if (!data || data.groups.length === 0) {
        return (
            <p className="text-sm text-slate-500 py-2">
                No OKR data for this period{readOnly ? ' (executive view)' : ''}.
            </p>
        );
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {readOnly ? 'Executive OKR rollup' : 'Portfolio OKR rollup'}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {data.totalOkrs} OKRs · org average {data.overallScore}%
                        </p>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b">
                            <th className="py-2 pr-4">Department</th>
                            <th className="py-2 pr-4">Employees</th>
                            <th className="py-2 pr-4">OKRs</th>
                            <th className="py-2">Avg achievement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g) => (
                            <tr key={g.department} className="border-b border-slate-50">
                                <td className="py-2.5 pr-4 font-medium text-slate-800">{g.department}</td>
                                <td className="py-2.5 pr-4 text-slate-600">{g.employeeCount}</td>
                                <td className="py-2.5 pr-4 text-slate-600">{g.okrCount}</td>
                                <td className="py-2.5">
                                    <span
                                        className={
                                            g.avgAchievement >= 80
                                                ? 'text-emerald-600 font-medium'
                                                : g.avgAchievement >= 60
                                                  ? 'text-amber-600 font-medium'
                                                  : 'text-red-500 font-medium'
                                        }
                                    >
                                        {g.avgAchievement}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
