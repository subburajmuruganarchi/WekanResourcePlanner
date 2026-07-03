import { Types } from 'mongoose';
import { Project } from '../../modules/projects/project.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';

/** Project IDs where the employee is PM (primary or additional), or owner. */
export async function getManagedProjectIds(pmEmployeeId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(pmEmployeeId)) {
        return [];
    }

    const pmOid = new Types.ObjectId(pmEmployeeId);
    const projects = await Project.find({
        $or: [
            { project_manager_id: pmOid },
            { project_owner_id: pmOid },
            { project_manager_ids: pmOid },
        ],
    })
        .select('_id')
        .lean();

    return projects.map((p) => p._id.toString());
}

export async function isProjectManagedBy(
    pmEmployeeId: string,
    projectId: string
): Promise<boolean> {
    if (!Types.ObjectId.isValid(pmEmployeeId) || !Types.ObjectId.isValid(projectId)) {
        return false;
    }
    const pmOid = new Types.ObjectId(pmEmployeeId);
    const projectOid = new Types.ObjectId(projectId);
    const match = await Project.exists({
        _id: projectOid,
        $or: [
            { project_manager_id: pmOid },
            { project_owner_id: pmOid },
            { project_manager_ids: pmOid },
        ],
    });
    return !!match;
}

/** Distinct employee IDs with active allocations on PM-managed projects. */
export async function getEmployeesAllocatedToManagedProjects(pmEmployeeId: string): Promise<string[]> {
    const projectIds = await getManagedProjectIds(pmEmployeeId);
    if (projectIds.length === 0) {
        return [];
    }

    const employeeIds = await ProjectAllocation.distinct('employee_id', {
        project_id: { $in: projectIds.map((id) => new Types.ObjectId(id)) },
        is_active: true,
    });

    return employeeIds.map((id) => id.toString());
}

export async function isEmployeeAllocatedToManagedProjects(
    pmEmployeeId: string,
    employeeId: string
): Promise<boolean> {
    if (!Types.ObjectId.isValid(employeeId)) {
        return false;
    }

    const projectIds = await getManagedProjectIds(pmEmployeeId);
    if (projectIds.length === 0) {
        return false;
    }

    const match = await ProjectAllocation.exists({
        employee_id: new Types.ObjectId(employeeId),
        project_id: { $in: projectIds.map((id) => new Types.ObjectId(id)) },
        is_active: true,
    });

    return !!match;
}
