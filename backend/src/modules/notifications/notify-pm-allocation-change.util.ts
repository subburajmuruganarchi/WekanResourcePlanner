import { Types } from 'mongoose';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { notificationService } from './notification.service';
import { NotificationType } from './notification.model';

export async function notifyProjectManagersOfAllocationChanges(
    actorId: string,
    projectIds: string[]
): Promise<void> {
    const uniqueProjectIds = [...new Set(projectIds.filter((id) => Types.ObjectId.isValid(id)))];
    if (uniqueProjectIds.length === 0) return;

    const actor = await Employee.findById(actorId).select('first_name last_name').lean();
    const actorName = actor
        ? `${actor.first_name ?? ''} ${actor.last_name ?? ''}`.trim() || 'Delivery manager'
        : 'Delivery manager';

    const projects = await Project.find({
        _id: { $in: uniqueProjectIds.map((id) => new Types.ObjectId(id)) },
    })
        .select('project_name project_code project_manager_id')
        .lean();

    const notified = new Set<string>();

    for (const project of projects) {
        const pmId = project.project_manager_id?.toString();
        if (!pmId || pmId === actorId || notified.has(pmId)) continue;
        notified.add(pmId);

        await notificationService.createNotification(
            pmId,
            'Resource plan updated',
            `${actorName} updated allocations on ${project.project_code} (${project.project_name}). Review the weekly planner.`,
            NotificationType.INFO,
            { projectId: project._id.toString(), changedBy: actorId }
        );
    }
}
