import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { api } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import type { StaffingRiskItem } from '@/components/dashboard/staffing-risk-cards';

export default function PmRisksPage() {
    const { projects } = useProjects();
    const [risks, setRisks] = useState<StaffingRiskItem[]>([]);

    useEffect(() => {
        api.get<StaffingRiskItem[]>('/dashboard/staffing-risks').then(setRisks).catch(() => setRisks([]));
    }, []);

    const projectIds = new Set(projects.map((p) => p.id));
    const myRisks = risks.filter((r) => projectIds.has(r.projectId));

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader eyebrow="Project Workspace" title="Project Risks" description="Staffing and delivery risks on your projects." />
            <WorkspaceSection title="Active risks">
                <div className="space-y-3">
                    {myRisks.length === 0 ? (
                        <p className="text-sm text-slate-500">No elevated risks on your projects.</p>
                    ) : (
                        myRisks.map((r) => (
                            <div key={r.projectId} className="dashboard-card p-4">
                                <p className="font-semibold">{r.name}</p>
                                <p className="text-xs text-rose-600 mt-1">{r.level} · Score {r.score}</p>
                                <ul className="mt-2 text-sm text-slate-600 list-disc pl-4">
                                    {r.reasons?.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
