import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
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

    const add = () => {
        if (!user?.id) return;
        const item: CommunicationItem = {
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
        };
        const next = [item, ...items];
        setItems(next);
        workspaceStore.saveCommunications(user.id, next);
    };

    const visible = filter === 'all' ? items : items.filter((i) => i.category === filter);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Communication"
                description="Structured updates, risks, decisions, actions, and announcements."
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
                        <p className="text-sm text-slate-500">No communication items yet.</p>
                    ) : (
                        visible.map((item) => (
                            <div key={item.id} className="dashboard-card p-4">
                                <div className="flex flex-wrap gap-2 items-center mb-2">
                                    <span className="text-xs font-semibold text-indigo-600">{item.category}</span>
                                    <HealthBadge health={item.status === 'Closed' ? 'Green' : item.priority === 'High' ? 'Red' : 'Amber'} />
                                </div>
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <p className="text-xs text-slate-500 mt-2">
                                    {item.author} · {item.role} · Owner: {item.owner} · Due {item.dueDate}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
