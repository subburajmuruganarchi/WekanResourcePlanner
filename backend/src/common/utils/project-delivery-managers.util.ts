import { Types } from 'mongoose';
import { DeliveryPortfolio } from '../../modules/delivery-portfolios/delivery-portfolio.model';
import { Employee } from '../../modules/employees/employee.model';

export interface ProjectDeliveryManagers {
    deliveryManagerIds: string[];
    deliveryManagerNames: string[];
}

/** Map project ID → delivery managers from active portfolios. */
export async function buildDeliveryManagersByProjectId(): Promise<
    Map<string, ProjectDeliveryManagers>
> {
    const portfolios = await DeliveryPortfolio.find({ is_active: true })
        .select('project_ids manager_ids')
        .lean();

    const allManagerIds = new Set<string>();
    for (const portfolio of portfolios) {
        for (const mid of portfolio.manager_ids ?? []) {
            allManagerIds.add(mid.toString());
        }
    }

    const managers = await Employee.find({
        _id: { $in: [...allManagerIds].map((id) => new Types.ObjectId(id)) },
    })
        .select('first_name last_name')
        .lean();

    const nameById = new Map<string, string>();
    for (const emp of managers) {
        nameById.set(emp._id.toString(), `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim());
    }

    const map = new Map<string, ProjectDeliveryManagers>();

    for (const portfolio of portfolios) {
        const managerIds = (portfolio.manager_ids ?? []).map((id) => id.toString());
        const managerNames = managerIds
            .map((id) => nameById.get(id))
            .filter((n): n is string => Boolean(n));

        for (const projectId of portfolio.project_ids ?? []) {
            const key = projectId.toString();
            const existing = map.get(key) ?? {
                deliveryManagerIds: [],
                deliveryManagerNames: [],
            };

            for (let i = 0; i < managerIds.length; i++) {
                const id = managerIds[i];
                if (!existing.deliveryManagerIds.includes(id)) {
                    existing.deliveryManagerIds.push(id);
                    const name = managerNames[i];
                    if (name && !existing.deliveryManagerNames.includes(name)) {
                        existing.deliveryManagerNames.push(name);
                    }
                }
            }

            map.set(key, existing);
        }
    }

    return map;
}

export async function getDeliveryManagersForProject(
    projectId: string
): Promise<ProjectDeliveryManagers> {
    const map = await buildDeliveryManagersByProjectId();
    return (
        map.get(projectId) ?? {
            deliveryManagerIds: [],
            deliveryManagerNames: [],
        }
    );
}
