import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { DeliveryRiskCards } from '@/components/dashboard/staffing-risk-cards';
import { useProjects } from '@/lib/use-projects';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function PmRisksPage() {
    const { projects, loading: projectsLoading } = useProjects();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchDeliveryRisks()
            .then(setRisks)
            .catch(() => setRisks([]))
            .finally(() => setLoading(false));
    }, []);

    const projectIds = new Set(projects.map((p) => p.id));
    const myRisks = risks.filter((r) => projectIds.has(r.projectId));

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Current Delivery Risk"
                description="Allocation and planner capacity on your projects — sourced from Project_Allocation and Weekly Planner."
            />
            <WorkspaceSection title="Active delivery risks">
                {loading || projectsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading delivery risks…
                    </div>
                ) : (
                    <DeliveryRiskCards risks={myRisks} />
                )}
            </WorkspaceSection>
        </PageContainer>
    );
}
