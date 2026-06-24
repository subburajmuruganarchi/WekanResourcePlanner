import { useMemo } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useEmployees } from '@/lib/use-employees';
import { useProjects } from '@/lib/use-projects';

interface MemberAssignment {
    projectName: string;
    projectCode: string;
    allocationPercent: number;
    startDate?: string;
    endDate?: string;
}

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
    const s = start?.slice(0, 10) ?? '—';
    const e = end?.slice(0, 10) ?? 'Ongoing';
    return `${s} → ${e}`;
}

export default function PmTeamPage() {
    const { employees, loading } = useEmployees({ allocatedToMyProjects: true });
    const { projects } = useProjects();

    const assignmentsByEmployee = useMemo(() => {
        const map = new Map<string, MemberAssignment[]>();
        for (const project of projects) {
            for (const member of project.teamMembers ?? []) {
                const entry: MemberAssignment = {
                    projectName: project.name,
                    projectCode: project.code,
                    allocationPercent: member.allocationPercent,
                    startDate: member.startDate ?? project.startDate,
                    endDate: member.endDate ?? project.endDate,
                };
                const list = map.get(member.employeeId) ?? [];
                list.push(entry);
                map.set(member.employeeId, list);
            }
        }
        return map;
    }, [projects]);

    const totalOccupancy = (assignments: MemberAssignment[]) =>
        assignments.reduce((sum, a) => sum + a.allocationPercent, 0);

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
                            const assignments = assignmentsByEmployee.get(e.id) ?? [];
                            const avail = e.availability ?? 100;
                            const occupancy = totalOccupancy(assignments);

                            return (
                                <div key={e.id} className="dashboard-card p-4">
                                    <p className="font-semibold text-slate-900">{e.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {e.jobRole || e.position || e.department}
                                    </p>
                                    <p className={`text-xs font-medium mt-2 ${availabilityClass(avail)}`}>
                                        {availabilityLabel(avail)}
                                        {occupancy > 0 && (
                                            <span className="text-slate-500 font-normal">
                                                {' '}
                                                · {occupancy}% on your projects
                                            </span>
                                        )}
                                    </p>

                                    {assignments.length > 0 ? (
                                        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                            {assignments.map((a) => (
                                                <li key={`${e.id}-${a.projectCode}`} className="text-xs">
                                                    <div className="flex justify-between gap-2">
                                                        <span className="font-medium text-slate-800 truncate">
                                                            {a.projectName}
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
                                            No active allocation rows on your projects.
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
