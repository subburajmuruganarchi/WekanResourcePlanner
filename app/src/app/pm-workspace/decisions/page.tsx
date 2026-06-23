import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { workspaceStore, type DecisionItem } from '@/lib/workspace-store';

export default function PmDecisionsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<DecisionItem[]>([]);

    useEffect(() => {
        if (user?.id) setItems(workspaceStore.getDecisions(user.id));
    }, [user?.id]);

    const add = () => {
        if (!user?.id) return;
        const next: DecisionItem[] = [
            {
                id: `dec-${Date.now()}`,
                decision: 'New decision',
                description: 'Describe the decision and context',
                owner: user.name ?? 'PM',
                approval: 'Pending',
                date: new Date().toISOString().slice(0, 10),
            },
            ...items,
        ];
        setItems(next);
        workspaceStore.saveDecisions(user.id, next);
    };

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Decision Log"
                description="Track project decisions, owners, and approval status."
                action={
                    <Button onClick={add} className="gap-2 enterprise-gradient-bg text-white border-0">
                        <Plus className="w-4 h-4" />
                        Add decision
                    </Button>
                }
            />
            <WorkspaceSection title="Decisions">
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
                                        <p className="font-medium">{d.decision}</p>
                                        <p className="text-xs text-slate-500">{d.description}</p>
                                    </td>
                                    <td className="px-4 py-3">{d.owner}</td>
                                    <td className="px-4 py-3">{d.approval}</td>
                                    <td className="px-4 py-3">{d.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
