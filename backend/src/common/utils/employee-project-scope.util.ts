import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { TimeEntry } from '../../modules/time-entries/time-entry.model';

/**
 * Project IDs an employee is assigned to — from roster allocations, weekly planner rows, or past time entries.
 */
export async function resolveEmployeeAssignedProjectIds(employeeId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(employeeId)) {
        return [];
    }

    const empOid = new Types.ObjectId(employeeId);

    const [fromAlloc, fromWeekly, fromTime] = await Promise.all([
        ProjectAllocation.distinct('project_id', {
            employee_id: empOid,
            is_active: { $ne: false },
        }),
        WeeklyAllocationEntry.distinct('project_id', { employee_id: empOid }),
        TimeEntry.distinct('projectId', { employeeId: empOid }),
    ]);

    const ids = new Set<string>();
    for (const id of [...fromAlloc, ...fromWeekly, ...fromTime]) {
        ids.add(id.toString());
    }

    return [...ids];
}
