import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { DeliveryRiskCards } from '@/components/dashboard/staffing-risk-cards';
import { useProjects } from '@/lib/use-projects';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';
import { useEffect, useState } from 'react';

export default function PmRisksPage() {
    const { projects } = useProjects();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);

    useEffect(() => {
        fetchDeliveryRisks().then(setRisks).catch(() => setRisks([]));
    }, []);

    const projectIds = new Set(projects.map((p) => p.id));
    const myRisks = risks.filter((r) => projectIds.has(r.projectId));

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Current Delivery Risk"
                description="Allocation and planner capacity on your projects — not project-plan skill estimates."
            />
            <WorkspaceSection title="Active delivery risks">
                <DeliveryRiskCards risks={myRisks} />
            </WorkspaceSection>
        </PageContainer>
    );
}
