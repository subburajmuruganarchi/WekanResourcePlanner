import { Request, Response, NextFunction } from 'express';
import { Role } from './role.model';

export class RoleController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roles = await Role.find({ isActive: true }).lean();
            res.json({
                status: 'success',
                data: roles.map(r => ({
                    id: r._id.toString(),
                    name: r.name,
                    isActive: r.isActive
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}

export const roleController = new RoleController();
