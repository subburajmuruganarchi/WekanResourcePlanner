import { useEffect, useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { isActiveProject, projectStatusOf } from '@/lib/project-status';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';

export default function PmStatusReportPage() {
    const { projects, loading } = useProjects();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);

    const active = useMemo(() => projects.filter((p) => isActiveProject(p)), [projects]);

    useEffect(() => {
        fetchDeliveryRisks()
            .then((all) => {
                const ids = new Set(projects.map((p) => p.id));
                setRisks((all ?? []).filter((r) => ids.has(r.projectId)));
            })
            .catch(() => setRisks([]));
    }, [projects]);

    const exportPdf = () => window.print();

    if (loading) {
        return (
            <PageContainer className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </PageContainer>
        );
    }

    return (
        <PageContainer className="space-y-6 print:space-y-4">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Weekly Status Report"
                description="Auto-generated from project status and delivery risk signals."
                action={
                    <Button variant="outline" className="gap-2 print:hidden" onClick={exportPdf}>
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </Button>
                }
            />

            {active.length === 0 ? (
                <p className="text-sm text-slate-500">No active projects assigned to you.</p>
            ) : (
                active.slice(0, 5).map((p) => {
                    const risk = risks.find((r) => r.projectId === p.id);
                    const health =
                        risk?.level === 'HIGH' ? 'At risk' : risk?.level === 'MEDIUM' ? 'Watch' : 'On track';

                    return (
                        <WorkspaceSection key={p.id} title={p.name}>
                            <div className="dashboard-card p-6 space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold text-slate-900">Overall Health</h4>
                                    <p className="text-slate-600 mt-1">
                                        {health} — {projectStatusOf(p)} · {p.code} · {p.teamSize ?? 0} team members
                                    </p>
                                </div>
                                {risk && (
                                    <div>
                                        <h4 className="font-semibold text-slate-900">Delivery Risks</h4>
                                        <ul className="mt-1 space-y-1 text-slate-600 list-disc pl-4">
                                            {risk.allocationRisks?.map((f, i) => (
                                                <li key={`a-${i}`}>{f.message}</li>
                                            ))}
                                            {risk.capacityRisks?.map((f, i) => (
                                                <li key={`c-${i}`}>{f.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold text-slate-900">Recommendations</h4>
                                    <p className="text-slate-600 mt-1">
                                        {(risk?.recommendations ?? ['Maintain current planner coverage for the week.']).join(
                                            ' '
                                        )}
                                    </p>
                                </div>
                            </div>
                        </WorkspaceSection>
                    );
                })
            )}
        </PageContainer>
    );
}
