import { Types } from 'mongoose';
import { Employee } from '../employees/employee.model';
import { Okr, IOkr } from './okr.model';
import { getEmployeesAllocatedToPortfolioProjects } from '../../common/utils/delivery-scope.util';

export interface OrgRollupGroup {
    department: string;
    employeeCount: number;
    okrCount: number;
    avgAchievement: number;
}

export interface OrgRollupResponse {
    groups: OrgRollupGroup[];
    overallScore: number;
    totalOkrs: number;
}

// Append to OkrService class — findOrgRollup method
export async function findOrgRollup(
    period: string | undefined,
    computeOkrAchievement: (keyResults: IOkr['key_results']) => number,
    employeeIdFilter?: string[]
): Promise<OrgRollupResponse> {
    const filter: Record<string, unknown> = {};
    if (period) filter.period = period;

    if (employeeIdFilter !== undefined) {
        if (employeeIdFilter.length === 0) {
            return { groups: [], overallScore: 0, totalOkrs: 0 };
        }
        filter.employee_id = { $in: employeeIdFilter.map((id) => new Types.ObjectId(id)) };
    }

    const okrs = (await Okr.find(filter).lean()) as unknown as IOkr[];
    if (okrs.length === 0) {
        return { groups: [], overallScore: 0, totalOkrs: 0 };
    }

    const employeeIds = [...new Set(okrs.map((o) => o.employee_id.toString()))];
    const employees = await Employee.find(
        { _id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) } },
        { department: 1 }
    ).lean();

    const deptByEmployee = new Map(
        employees.map((e) => [e._id.toString(), (e.department as string) || 'Unassigned'])
    );

    const groupMap = new Map<
        string,
        { employeeIds: Set<string>; achievements: number[] }
    >();

    for (const okr of okrs) {
        const dept = deptByEmployee.get(okr.employee_id.toString()) ?? 'Unassigned';
        const group = groupMap.get(dept) ?? { employeeIds: new Set(), achievements: [] };
        group.employeeIds.add(okr.employee_id.toString());
        group.achievements.push(computeOkrAchievement(okr.key_results));
        groupMap.set(dept, group);
    }

    const groups: OrgRollupGroup[] = [...groupMap.entries()]
        .map(([department, data]) => ({
            department,
            employeeCount: data.employeeIds.size,
            okrCount: data.achievements.length,
            avgAchievement:
                data.achievements.length > 0
                    ? Math.round(
                          data.achievements.reduce((s, v) => s + v, 0) / data.achievements.length
                      )
                    : 0,
        }))
        .sort((a, b) => b.avgAchievement - a.avgAchievement);

    const allAchievements = okrs.map((o) => computeOkrAchievement(o.key_results));
    const overallScore =
        allAchievements.length > 0
            ? Math.round(allAchievements.reduce((s, v) => s + v, 0) / allAchievements.length)
            : 0;

    return { groups, overallScore, totalOkrs: okrs.length };
}

export async function resolveOrgRollupEmployeeFilter(
    role: string | undefined,
    employeeId: string | undefined
): Promise<string[] | undefined> {
    if (role === 'Delivery Manager' && employeeId) {
        return getEmployeesAllocatedToPortfolioProjects(employeeId);
    }
    return undefined;
}
