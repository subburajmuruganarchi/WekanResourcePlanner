import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspacePageHeader, WorkspaceSection, HealthBadge } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { workspaceStore, type CommunicationItem, type CommCategory } from '@/lib/workspace-store';

const CATEGORIES: CommCategory[] = ['Update', 'Risk', 'Decision', 'Action', 'Announcement'];

export default function PmCommunicationPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<CommunicationItem[]>([]);
    const [filter, setFilter] = useState<CommCategory | 'all'>('all');

    useEffect(() => {
        if (user?.id) setItems(workspaceStore.getCommunications(user.id));
    }, [user?.id]);

    const persist = (next: CommunicationItem[]) => {
        setItems(next);
        if (user?.id) workspaceStore.saveCommunications(user.id, next);
    };

    const add = () => {
        if (!user?.id) return;
        persist([
            {
                id: `comm-${Date.now()}`,
                category: 'Update',
                title: 'New update',
                author: user.name ?? 'PM',
                role: user.role ?? 'Project Manager',
                priority: 'Medium',
                owner: user.name ?? 'PM',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                status: 'Open',
                createdAt: new Date().toISOString(),
            },
            ...items,
        ]);
    };

    const update = (id: string, patch: Partial<CommunicationItem>) => {
        persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    };

    const visible = filter === 'all' ? items : items.filter((i) => i.category === filter);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Communication"
                description="PM workspace notes in your browser — for stakeholder updates until a shared comms module is added. Click fields to edit."
                action={
                    <Button onClick={add} className="gap-2 enterprise-gradient-bg text-white border-0">
                        <Plus className="w-4 h-4" />
                        New item
                    </Button>
                }
            />

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFilter('all')} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200">All</button>
                {CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setFilter(c)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200">{c}</button>
                ))}
            </div>

            <WorkspaceSection title="Communication timeline">
                <div className="space-y-3">
                    {visible.length === 0 ? (
                        <p className="text-sm text-slate-500">No communication items yet. Add updates for your project stakeholders.</p>
                    ) : (
                        visible.map((item) => (
                            <div key={item.id} className="dashboard-card p-4 space-y-2">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <select
                                        className="text-xs font-semibold text-brand-600 border border-slate-200 rounded px-2 py-1"
                                        value={item.category}
                                        onChange={(e) => update(item.id, { category: e.target.value as CommCategory })}
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <HealthBadge health={item.status === 'Closed' ? 'Green' : item.priority === 'High' ? 'Red' : 'Amber'} />
                                </div>
                                <Input
                                    className="font-semibold"
                                    value={item.title}
                                    onChange={(e) => update(item.id, { title: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Input value={item.owner} onChange={(e) => update(item.id, { owner: e.target.value })} placeholder="Owner" />
                                    <Input type="date" value={item.dueDate} onChange={(e) => update(item.id, { dueDate: e.target.value })} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
