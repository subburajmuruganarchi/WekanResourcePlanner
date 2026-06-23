import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { workspaceStore, type DecisionItem } from '@/lib/workspace-store';

export default function PmDecisionsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<DecisionItem[]>([]);

    useEffect(() => {
        if (user?.id) setItems(workspaceStore.getDecisions(user.id));
    }, [user?.id]);

    const persist = (next: DecisionItem[]) => {
        setItems(next);
        if (user?.id) workspaceStore.saveDecisions(user.id, next);
    };

    const add = () => {
        if (!user?.id) return;
        persist([
            {
                id: `dec-${Date.now()}`,
                decision: 'New decision',
                description: 'Describe the decision and context',
                owner: user.name ?? 'PM',
                approval: 'Pending',
                date: new Date().toISOString().slice(0, 10),
            },
            ...items,
        ]);
    };

    const update = (id: string, patch: Partial<DecisionItem>) => {
        persist(items.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    };

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Decision Log"
                description="Personal PM workspace notes stored in your browser — not shared with other roles yet. Click any field to edit."
                action={
                    <Button onClick={add} className="gap-2 enterprise-gradient-bg text-white border-0">
                        <Plus className="w-4 h-4" />
                        Add decision
                    </Button>
                }
            />
            <WorkspaceSection title="Decisions">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4">
                        No decisions logged yet. Use Add decision to track approvals and context for your projects.
                    </p>
                ) : (
                    <div className="dashboard-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase text-slate-400 border-b bg-slate-50/80">
                                    <th className="px-4 py-3">Decision</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Approval</th>
                                    <th className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((d) => (
                                    <tr key={d.id} className="border-b border-slate-50">
                                        <td className="px-4 py-3">
                                            <Input
                                                className="h-8 font-medium mb-1"
                                                value={d.decision}
                                                onChange={(e) => update(d.id, { decision: e.target.value })}
                                            />
                                            <Input
                                                className="h-8 text-xs"
                                                value={d.description}
                                                onChange={(e) => update(d.id, { description: e.target.value })}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                className="h-8"
                                                value={d.owner}
                                                onChange={(e) => update(d.id, { owner: e.target.value })}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                className="h-8"
                                                value={d.approval}
                                                onChange={(e) => update(d.id, { approval: e.target.value })}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                className="h-8"
                                                type="date"
                                                value={d.date}
                                                onChange={(e) => update(d.id, { date: e.target.value })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </WorkspaceSection>
        </PageContainer>
    );
}
