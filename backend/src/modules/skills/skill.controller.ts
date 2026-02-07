import { Request, Response, NextFunction } from 'express';
import { Skill } from './skill.model';

export class SkillController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const skills = await Skill.find({ isActive: true }).lean();
            res.json({
                status: 'success',
                data: skills.map(s => ({
                    id: s._id.toString(),
                    name: s.name,
                    category: s.category,
                    isActive: s.isActive
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}

export const skillController = new SkillController();
