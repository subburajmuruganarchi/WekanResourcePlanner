import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceUnderConstruction } from '@/components/workspaces/shared';

export default function DeliveryMilestonesPage() {
    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="Milestone Tracking"
                description="Portfolio milestone timeline — planned for a future release."
            />
            <WorkspaceUnderConstruction
                message="Milestone phases and progress tracking are not part of the MVP. Use the Command Center, project list, and weekly planner for delivery status today."
            />
        </PageContainer>
    );
}
