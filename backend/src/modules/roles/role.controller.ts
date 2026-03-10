import { Request, Response, NextFunction } from 'express';
import { Role } from './role.model';

export class RoleController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roles = await Role.find({
                $or: [
                    { is_active: true },
                    { status: 'Active' }
                ]
            }).lean();
            res.json({
                status: 'success',
                data: roles.map((r: any) => ({
                    id: r._id.toString(),
                    name: r.role_name,
                    isActive: r.is_active
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}

export const roleController = new RoleController();
