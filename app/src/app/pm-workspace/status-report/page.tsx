import { useMemo } from 'react';
import { ReportsWorkspace } from '@/components/reports/reports-workspace';
import { useProjects } from '@/lib/use-projects';

export default function PmStatusReportPage() {
    const { projects } = useProjects();

    const managedProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

    return (
        <ReportsWorkspace
            title="Project Reports"
            description="Live master schedules and capacity reports for your managed projects. Refresh to reload allocation data, or download Excel files for offline use."
            projectIdsFilter={managedProjectIds}
        />
    );
}
