import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';

export class SearchController {
    async search(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const q = ((req.query.q as string) || '').trim();
            if (q.length < 2) {
                res.json({ status: 'success', data: { employees: [], projects: [] } });
                return;
            }

            const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const authId = getAuthEmployeeId(req.user);
            const isPmOrAdmin = req.user?.role === 'Admin' || req.user?.role === 'Project Manager';

            const employeeFilter: Record<string, unknown> = {
                $or: [
                    { first_name: regex },
                    { last_name: regex },
                    { email: regex },
                ],
                status: 'Active',
            };

            const employees = await Employee.find(employeeFilter)
                .limit(8)
                .select('first_name last_name email')
                .lean();

            let projectFilter: Record<string, unknown> = {
                $or: [{ project_name: regex }, { project_code: regex }],
            };

            if (!isPmOrAdmin && authId) {
                const oid = new Types.ObjectId(authId);
                projectFilter = {
                    $and: [
                        projectFilter,
                        {
                            $or: [
                                { project_manager_id: oid },
                                { project_owner_id: oid },
                            ],
                        },
                    ],
                };
            }

            const projects = await Project.find(projectFilter)
                .limit(8)
                .select('project_name project_code status')
                .lean();

            res.json({
                status: 'success',
                data: {
                    employees: employees.map((e) => ({
                        id: e._id.toString(),
                        name: `${e.first_name} ${e.last_name}`.trim(),
                        email: e.email,
                        href: isPmOrAdmin ? '/projects' : '/time-entry',
                    })),
                    projects: projects.map((p) => ({
                        id: p._id.toString(),
                        name: p.project_name,
                        code: p.project_code,
                        status: p.status,
                        href: `/projects/${p._id}`,
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const searchController = new SearchController();
