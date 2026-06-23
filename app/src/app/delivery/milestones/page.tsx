import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection, HealthBadge } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';
import { workspaceStore, type MilestoneItem } from '@/lib/workspace-store';

const PHASES = ['Requirement', 'Development', 'Testing', 'Release'];

export default function DeliveryMilestonesPage() {
    const { user } = useAuth();
    const { portfolioProjects } = useDeliveryCommandMetrics();
    const [milestones, setMilestones] = useState<MilestoneItem[]>([]);

    useEffect(() => {
        if (!user?.id) return;
        const stored = workspaceStore.getMilestones(user.id);
        if (stored.length > 0 && stored[0].projectName !== 'Portfolio') {
            setMilestones(stored);
            return;
        }
        const generated: MilestoneItem[] = [];
        for (const p of portfolioProjects.slice(0, 4)) {
            for (const phase of PHASES) {
                generated.push({
                    id: `${p.id}-${phase}`,
                    projectId: p.id,
                    projectName: p.name,
                    phase,
                    progress: phase === 'Release' ? 40 : phase === 'Testing' ? 65 : 80,
                    owner: p.managerName || 'PM',
                    dueDate: p.endDate?.slice(0, 10) ?? '—',
                    riskStatus: phase === 'Testing' ? 'At Risk' : 'On Track',
                });
            }
        }
        setMilestones(generated.length ? generated : stored);
    }, [user?.id, portfolioProjects]);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="Milestone Tracking"
                description="Project milestone timeline with progress, ownership, and risk status."
            />
            <WorkspaceSection title="Portfolio timeline">
                <div className="dashboard-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b bg-slate-50/80">
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Milestone</th>
                                    <th className="px-4 py-3">Progress</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Due</th>
                                    <th className="px-4 py-3">Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {milestones.map((m) => (
                                    <tr key={m.id} className="border-b border-slate-50">
                                        <td className="px-4 py-3 font-medium">{m.projectName}</td>
                                        <td className="px-4 py-3">{m.phase}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.progress}%` }} />
                                                </div>
                                                {m.progress}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{m.owner}</td>
                                        <td className="px-4 py-3">{m.dueDate}</td>
                                        <td className="px-4 py-3"><HealthBadge health={m.riskStatus} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
