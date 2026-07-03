import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { PortfolioHealthRow } from '@/lib/portfolio-health-rows';

const HEALTH_COLORS: Record<string, string> = {
    Green: '#22c55e',
    Amber: '#f59e0b',
    Red: '#ef4444',
};

export function DeliveryPortfolioCharts({ rows }: { rows: PortfolioHealthRow[] }) {
    const healthData = useMemo(() => {
        const counts = { Green: 0, Amber: 0, Red: 0 };
        for (const row of rows) {
            counts[row.health] += 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [rows]);

    const progressData = useMemo(
        () =>
            [...rows]
                .sort((a, b) => b.progress - a.progress)
                .slice(0, 8)
                .map((r) => ({
                    name: r.projectName.length > 18 ? `${r.projectName.slice(0, 16)}…` : r.projectName,
                    progress: r.progress,
                    confidence: r.confidence,
                })),
        [rows]
    );

    if (rows.length === 0) {
        return (
            <p className="text-sm text-slate-500 dashboard-card p-6">No active projects to chart yet.</p>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="dashboard-card p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Portfolio health mix</h3>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={healthData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {healthData.map((entry) => (
                                    <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] ?? '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="dashboard-card p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Progress vs confidence (top projects)</h3>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={progressData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="progress" name="Progress %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="confidence" name="Confidence %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
