import { Briefcase, Flag, UserCog } from 'lucide-react';
import { ProjectManagerAssignment } from '@/app/allocation/components/project-manager-assignment';
import { DeliveryManagerAssignment } from './delivery-manager-assignment';
import { ProjectStatusAssignment } from './project-status-assignment';

interface ProjectLeadershipPanelProps {
    projectId: string;
    managerId?: string;
    managerName?: string;
    deliveryManagerIds?: string[];
    deliveryManagerNames?: string[];
    status: string;
    onUpdated?: () => void;
}

export function ProjectLeadershipPanel({
    projectId,
    managerId,
    managerName,
    deliveryManagerIds,
    deliveryManagerNames,
    status,
    onUpdated,
}: ProjectLeadershipPanelProps) {
    return (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <header className="mb-5">
                <h3 className="text-sm font-semibold text-slate-900">Project leadership</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                    Assign the people accountable for this project and set its delivery status.
                    Changes apply immediately across dashboards and workspaces.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
                <ProjectManagerAssignment
                    variant="card"
                    icon={UserCog}
                    hint="Owns day-to-day delivery and timesheet approvals."
                    projectId={projectId}
                    managerId={managerId}
                    managerName={managerName}
                    onUpdated={onUpdated}
                />
                <DeliveryManagerAssignment
                    variant="card"
                    icon={Briefcase}
                    hint="Portfolio owner with allocation edit access."
                    projectId={projectId}
                    managerIds={deliveryManagerIds}
                    managerNames={deliveryManagerNames}
                    onUpdated={onUpdated}
                />
                <ProjectStatusAssignment
                    variant="card"
                    icon={Flag}
                    hint="Reflects the project sheet lifecycle stage."
                    projectId={projectId}
                    status={status}
                    onUpdated={onUpdated}
                />
            </div>
        </section>
    );
}
