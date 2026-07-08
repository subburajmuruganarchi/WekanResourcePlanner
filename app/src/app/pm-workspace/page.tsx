import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Users, AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, MetricCard, MetricGrid, PageSkeleton } from '@/components/patterns';
import { TeamWorkloadChart, aggregateTeamWorkload } from '@/components/dashboard/TeamWorkloadChart';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';
import { useAuth } from '@/lib/auth-context';
import { isActiveProject, projectStatusOf } from '@/lib/project-status';
import { filterProjectsManagedByEmployee } from '@/lib/project-scope';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';
import { useUtilizationVariance } from '@/lib/use-utilization';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';

export default function PmDashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { projects, loading } = useProjects();
    const { employees, loading: teamLoading } = useEmployees({ allocatedToMyProjects: true, activeOnly: true });
    const { data: utilizationData, loading: utilLoading, fetchVariance } = useUtilizationVariance();
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);

    const assignedProjects = useMemo(
        () => filterProjectsManagedByEmployee(projects, user?.id),
        [projects, user?.id]
    );

    const myProjectIds = useMemo(() => new Set(assignedProjects.map((p) => p.id)), [assignedProjects]);

    const activeProjects = useMemo(() => assignedProjects.filter((p) => isActiveProject(p)), [assignedProjects]);

    const teamSize = useMemo(() => {
        const fromProjects = assignedProjects.reduce((sum, p) => sum + (p.teamSize ?? 0), 0);
        return Math.max(employees.length, fromProjects > 0 ? fromProjects : 0);
    }, [assignedProjects, employees.length]);

    const teamWorkload = useMemo(() => {
        const rows = utilizationData?.rows ?? [];
        const scoped = rows.filter((r) => myProjectIds.has(r.projectId));
        return aggregateTeamWorkload(scoped);
    }, [utilizationData, myProjectIds]);

    useEffect(() => {
        const week = getCurrentWeekStart();
        const period = buildDashboardPeriodRange('week', week, getCurrentMonthValue());
        void fetchVariance({
            weekStartFrom: period.weekStartFrom,
            weekStartTo: period.weekStartTo,
        });
    }, [fetchVariance]);

    useEffect(() => {
        fetchDeliveryRisks()
            .then((all) => {
                setRisks((all ?? []).filter((r) => myProjectIds.has(r.projectId)));
            })
            .catch(() => setRisks([]));
    }, [myProjectIds]);

    const atRisk = risks.filter((r) => r.level === 'MEDIUM' || r.level === 'HIGH').length;

    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Project Workspace"
                title="Project Dashboard"
                description="Your delivery command view — projects you manage, team workload, and execution health."
            />

            <MetricGrid columns={{ sm: 2, xl: 4 }}>
                <MetricCard
                    label="Assigned projects"
                    value={String(assignedProjects.length)}
                    icon={FolderKanban}
                    hint="Projects where you are PM or owner"
                    onClick={() => navigate('/projects')}
                />
                <MetricCard
                    label="Active projects"
                    value={String(activeProjects.length)}
                    icon={FolderKanban}
                    accent="sky"
                    hint="Assigned projects currently in flight"
                />
                <MetricCard label="Team members" value={teamLoading ? '—' : String(teamSize)} icon={Users} accent="sky" />
                <MetricCard
                    label="At risk"
                    value={String(atRisk)}
                    accent="amber"
                    icon={AlertTriangle}
                    onClick={() => navigate('/pm/risks')}
                />
            </MetricGrid>

            <Section title="Team workload" description="Planned vs actual hours for your project teams this week.">
                <TeamWorkloadChart rows={teamWorkload} loading={utilLoading} />
            </Section>

            <Section title="Your projects">
                {assignedProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No projects assigned to you as manager or owner. Ask an admin to link your account on the
                        Project sheet.
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {assignedProjects.slice(0, 6).map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="dashboard-card p-4 text-left hover:border-brand-200 dark:hover:border-brand-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
                            >
                                <p className="font-semibold text-card-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {p.code} · {projectStatusOf(p)} · {p.teamSize ?? 0} on team
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/pm/status-report')}>
                    Status Report
                </Button>
                <Button variant="outline" onClick={() => navigate('/pm/timeline')}>
                    Timeline
                </Button>
                <Button variant="outline" onClick={() => navigate('/time-entry')}>
                    Team Time
                </Button>
            </div>
        </PageContainer>
    );
}
