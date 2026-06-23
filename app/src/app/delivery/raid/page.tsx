import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection, HealthBadge } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { workspaceStore, type RaidItem, type RaidType } from '@/lib/workspace-store';

const TYPES: RaidType[] = ['Risk', 'Assumption', 'Issue', 'Dependency'];

export default function RaidBoardPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<RaidItem[]>([]);
    const [filter, setFilter] = useState<RaidType | 'all'>('all');

    useEffect(() => {
        if (user?.id) setItems(workspaceStore.getRaid(user.id));
    }, [user?.id]);

    const save = (next: RaidItem[]) => {
        if (!user?.id) return;
        setItems(next);
        workspaceStore.saveRaid(user.id, next);
    };

    const addItem = () => {
        const item: RaidItem = {
            id: `raid-${Date.now()}`,
            type: 'Risk',
            title: 'New RAID item',
            owner: user?.name ?? 'Unassigned',
            priority: 'Medium',
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            status: 'Open',
            impact: 'TBD',
            createdAt: new Date().toISOString(),
        };
        save([item, ...items]);
    };

    const visible = filter === 'all' ? items : items.filter((i) => i.type === filter);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="RAID Management"
                description="Track Risks, Assumptions, Issues, and Dependencies across your portfolio."
                action={
                    <Button onClick={addItem} className="gap-2 enterprise-gradient-bg text-white border-0">
                        <Plus className="w-4 h-4" />
                        Create RAID item
                    </Button>
                }
            />

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm border ${filter === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200'}`}>All</button>
                {TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm border ${filter === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200'}`}>{t}</button>
                ))}
            </div>

            <WorkspaceSection title="RAID board">
                <div className="space-y-3">
                    {visible.map((item) => (
                        <div key={item.id} className="dashboard-card p-5">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{item.type}</span>
                                <HealthBadge health={item.status === 'Closed' ? 'Green' : item.priority === 'High' ? 'Red' : 'Amber'} />
                            </div>
                            <h3 className="font-semibold text-slate-900">{item.title}</h3>
                            <div className="grid sm:grid-cols-4 gap-2 mt-3 text-sm text-slate-600">
                                <div><span className="text-slate-400">Owner:</span> {item.owner}</div>
                                <div><span className="text-slate-400">Due:</span> {item.dueDate}</div>
                                <div><span className="text-slate-400">Priority:</span> {item.priority}</div>
                                <div><span className="text-slate-400">Impact:</span> {item.impact}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
