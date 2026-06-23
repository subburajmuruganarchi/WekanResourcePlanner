import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection, HealthBadge } from '@/components/workspaces/shared';
import { useExecutiveMetrics } from '@/lib/use-executive-metrics';

export default function PortfolioHealthPage() {
    const { portfolioRows, loading } = useExecutiveMetrics();
    const [projectFilter, setProjectFilter] = useState('');
    const [healthFilter, setHealthFilter] = useState<'all' | 'Green' | 'Amber' | 'Red'>('all');

    const projectNames = useMemo(
        () => [...new Set(portfolioRows.map((r) => r.projectName))].sort(),
        [portfolioRows]
    );

    const rows = useMemo(() => {
        return portfolioRows
            .filter((r) => !projectFilter || r.projectName === projectFilter)
            .filter((r) => healthFilter === 'all' || r.health === healthFilter)
            .sort((a, b) => {
                const order = { Red: 0, Amber: 1, Green: 2 };
                return order[a.health] - order[b.health] || b.confidence - a.confidence;
            });
    }, [portfolioRows, projectFilter, healthFilter]);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="Portfolio Health"
                description="Enterprise portfolio view — each project name is the customer account. Filter by project and delivery status."
            />

            <div className="flex flex-wrap gap-3">
                <select
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                >
                    <option value="">All projects</option>
                    {projectNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <select
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value as typeof healthFilter)}
                >
                    <option value="all">All statuses</option>
                    <option value="Green">On track</option>
                    <option value="Amber">At risk</option>
                    <option value="Red">Critical</option>
                </select>
            </div>

            <WorkspaceSection title="Portfolio grid">
                <div className="dashboard-card overflow-hidden">
                    {loading ? (
                        <p className="p-8 text-sm text-slate-500">Loading portfolio…</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b bg-slate-50/80">
                                        <th className="px-4 py-3">Project</th>
                                        <th className="px-4 py-3">Health</th>
                                        <th className="px-4 py-3">Progress</th>
                                        <th className="px-4 py-3">Delivery Confidence</th>
                                        <th className="px-4 py-3">Risk</th>
                                        <th className="px-4 py-3">Owner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.projectId} className="border-b border-slate-50">
                                            <td className="px-4 py-3 font-medium">{row.projectName}</td>
                                            <td className="px-4 py-3">
                                                <HealthBadge health={row.health} />
                                            </td>
                                            <td className="px-4 py-3">{row.progress}%</td>
                                            <td className="px-4 py-3 font-semibold">{row.confidence}%</td>
                                            <td className="px-4 py-3">{row.riskLevel}</td>
                                            <td className="px-4 py-3 text-slate-500">{row.owner}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
