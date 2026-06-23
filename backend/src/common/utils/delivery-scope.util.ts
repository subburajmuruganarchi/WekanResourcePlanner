import { Types } from 'mongoose';
import { DeliveryPortfolio } from '../../modules/delivery-portfolios/delivery-portfolio.model';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';

/** Active portfolio project IDs assigned to a Delivery Manager employee. */
export async function getPortfolioProjectIds(dmEmployeeId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(dmEmployeeId)) {
        return [];
    }

    const dmOid = new Types.ObjectId(dmEmployeeId);
    const portfolios = await DeliveryPortfolio.find({
        is_active: true,
        manager_ids: dmOid,
    })
        .select('project_ids')
        .lean();

    const ids = new Set<string>();
    for (const p of portfolios) {
        for (const pid of p.project_ids ?? []) {
            ids.add(pid.toString());
        }
    }
    return [...ids];
}

/** Distinct employees with active allocations on portfolio projects. */
export async function getEmployeesAllocatedToPortfolioProjects(dmEmployeeId: string): Promise<string[]> {
    const projectIds = await getPortfolioProjectIds(dmEmployeeId);
    if (projectIds.length === 0) {
        return [];
    }

    const employeeIds = await ProjectAllocation.distinct('employee_id', {
        project_id: { $in: projectIds.map((id) => new Types.ObjectId(id)) },
        is_active: true,
    });

    return employeeIds.map((id) => id.toString());
}

export async function isProjectInDeliveryManagerPortfolio(
    dmEmployeeId: string,
    projectId: string
): Promise<boolean> {
    if (!Types.ObjectId.isValid(projectId)) {
        return false;
    }
    const projectIds = await getPortfolioProjectIds(dmEmployeeId);
    return projectIds.includes(projectId);
}

export async function isEmployeeAllocatedToPortfolioProjects(
    dmEmployeeId: string,
    employeeId: string
): Promise<boolean> {
    if (!Types.ObjectId.isValid(employeeId)) {
        return false;
    }

    const projectIds = await getPortfolioProjectIds(dmEmployeeId);
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
