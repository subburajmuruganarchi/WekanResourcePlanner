import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useEmployees } from '@/lib/use-employees';
import type { EmployeeProjectAssignment } from '@/types/api';

function availabilityLabel(percent: number): string {
    if (percent <= 0) return 'Fully allocated';
    return `${percent}% available`;
}

function availabilityClass(percent: number): string {
    if (percent <= 0) return 'text-red-600';
    if (percent < 50) return 'text-amber-700';
    return 'text-emerald-700';
}

function formatPeriod(start?: string, end?: string): string {
    const s = start?.slice(0, 10) || '—';
    const e = end?.slice(0, 10) || 'Ongoing';
    return `${s} → ${e}`;
}

function totalCommitted(assignments: EmployeeProjectAssignment[]): number {
    return assignments.reduce((sum, a) => sum + a.allocationPercent, 0);
}

function sortAssignments(assignments: EmployeeProjectAssignment[]): EmployeeProjectAssignment[] {
    return [...assignments].sort((a, b) => {
        if (a.onYourProjects !== b.onYourProjects) return a.onYourProjects ? -1 : 1;
        return b.allocationPercent - a.allocationPercent;
    });
}

export default function PmTeamPage() {
    const { employees, loading } = useEmployees({ allocatedToMyProjects: true });

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Team"
                description="Resources allocated to your managed projects."
            />
            <WorkspaceSection title="Team roster">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading team…</p>
                    ) : employees.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4">
                            No team members allocated to your projects yet.
                        </p>
                    ) : (
                        employees.map((e) => {
                            const assignments = sortAssignments(e.projectAssignments ?? []);
                            const avail = e.availability ?? 100;
                            const committed = totalCommitted(assignments);
                            const onYourProjects = assignments.filter((a) => a.onYourProjects);
                            const onYourCommitted = totalCommitted(onYourProjects);

                            return (
                                <div key={e.id} className="dashboard-card p-4">
                                    <p className="font-semibold text-slate-900">{e.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {e.jobRole || e.position || e.department}
                                    </p>
                                    <p className={`text-xs font-medium mt-2 ${availabilityClass(avail)}`}>
                                        {availabilityLabel(avail)}
                                        {committed > 0 && (
                                            <span className="text-slate-500 font-normal">
                                                {' '}
                                                · {committed}% committed across {assignments.length} project
                                                {assignments.length === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </p>
                                    {onYourCommitted > 0 && onYourCommitted !== committed && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {onYourCommitted}% on your projects
                                        </p>
                                    )}

                                    {assignments.length > 0 ? (
                                        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                            {assignments.map((a) => (
                                                <li
                                                    key={`${e.id}-${a.projectId}`}
                                                    className="text-xs"
                                                >
                                                    <div className="flex justify-between gap-2">
                                                        <span
                                                            className={
                                                                a.onYourProjects
                                                                    ? 'font-medium text-slate-800 truncate'
                                                                    : 'text-slate-600 truncate'
                                                            }
                                                        >
                                                            {a.projectName}
                                                            {!a.onYourProjects && (
                                                                <span className="text-slate-400 font-normal">
                                                                    {' '}
                                                                    (other)
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-brand-600 font-semibold shrink-0">
                                                            {a.allocationPercent}%
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-400 mt-0.5">
                                                        {formatPeriod(a.startDate, a.endDate)}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-3">
                                            No active project allocations found.
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
