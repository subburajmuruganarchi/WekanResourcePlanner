import { Request, Response, NextFunction } from 'express';
import { Skill } from './skill.model';
import { AppError } from '../../common/errors/app-error';

export class SkillController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const skills = await Skill.find({
                $or: [
                    { is_active: true },
                    { status: 'Active' }
                ]
            }).lean();
            res.json({
                status: 'success',
                data: skills.map(s => ({
                    id: s._id.toString(),
                    name: s.name,
                    category: s.category,
                    isActive: s.is_active
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, category, description } = req.body;

            // Duplicate validation (case-insensitive)
            const existing = await Skill.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            });

            if (existing) {
                throw new AppError(`Skill '${name}' already exists`, 400);
            }

            const skill = new Skill({
                name,
                category,
                description,
                is_active: true
            });

            await skill.save();

            res.status(201).json({
                status: 'success',
                data: {
                    id: skill._id.toString(),
                    name: skill.name,
                    category: skill.category,
                    isActive: skill.is_active
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { name, category, description, isActive } = req.body;

            // Duplicate validation if name is changing
            if (name) {
                const existing = await Skill.findOne({
                    _id: { $ne: id },
                    name: { $regex: new RegExp(`^${name}$`, 'i') }
                });

                if (existing) {
                    throw new AppError(`Skill '${name}' already exists`, 400);
                }
            }

            const skill = await Skill.findByIdAndUpdate(
                id,
                {
                    name,
                    category,
                    description,
                    is_active: isActive
                },
                { new: true, runValidators: true }
            );

            if (!skill) {
                throw new AppError('Skill not found', 404);
            }

            res.json({
                status: 'success',
                data: {
                    id: skill._id.toString(),
                    name: skill.name,
                    category: skill.category,
                    isActive: skill.is_active
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            // Check if skill is in use (Optional, but safer)
            // For now, we'll just allow deletion or rely on isActive toggle for soft delete
            const skill = await Skill.findByIdAndDelete(id);

            if (!skill) {
                throw new AppError('Skill not found', 404);
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export const skillController = new SkillController();
