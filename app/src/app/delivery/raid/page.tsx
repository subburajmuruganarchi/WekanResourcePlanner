import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceUnderConstruction } from '@/components/workspaces/shared';

export default function RaidBoardPage() {
    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="RAID Management"
                description="Risk, assumption, issue, and dependency tracking — planned for a future release."
            />
            <WorkspaceUnderConstruction
                message="A shared RAID board is not part of the MVP. Use Command Center delivery risks and Suggested Actions for portfolio issues that need attention this week."
            />
        </PageContainer>
    );
}
