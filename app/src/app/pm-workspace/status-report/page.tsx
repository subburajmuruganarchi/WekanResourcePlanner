import { FileDown } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';

export default function PmStatusReportPage() {
    const { projects } = useProjects();
    const active = projects.filter((p) => p.status === 'Active');

    const exportPdf = () => window.print();

    return (
        <PageContainer className="space-y-6 print:space-y-4">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Weekly Status Report"
                description="Structured delivery status — generate and export for stakeholders."
                action={
                    <Button variant="outline" className="gap-2 print:hidden" onClick={exportPdf}>
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </Button>
                }
            />

            {active.slice(0, 3).map((p) => (
                <WorkspaceSection key={p.id} title={p.name}>
                    <div className="dashboard-card p-6 space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-slate-900">Overall Health</h4>
                            <p className="text-slate-600 mt-1">On track — {p.status} delivery for {p.code}.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Completed</h4>
                            <p className="text-slate-600 mt-1">Sprint deliverables and milestone checkpoints closed this week.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Planned</h4>
                            <p className="text-slate-600 mt-1">Next sprint scope and release preparation activities.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Risks</h4>
                            <p className="text-slate-600 mt-1">Monitor resource availability and dependency lead times.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Dependencies</h4>
                            <p className="text-slate-600 mt-1">Cross-team API contracts and environment readiness.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Next Steps</h4>
                            <p className="text-slate-600 mt-1">Finalize QA cycle and stakeholder sign-off.</p>
                        </div>
                    </div>
                </WorkspaceSection>
            ))}
        </PageContainer>
    );
}
