import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { CreateEmployeeSchema } from './employee.schema';
import { AppError } from '../../common/errors/app-error';

export class EmployeeController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const params = {
                skill: req.query.skill as string | undefined,
                minLevel: req.query.minLevel as string | undefined,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
            };

            const employees = await employeeService.findAll(params);

            res.json({
                status: 'success',
                data: employees,
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const employee = await employeeService.findById(id);

            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            res.json({
                status: 'success',
                data: employee,
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body with Zod
            const validatedData = CreateEmployeeSchema.parse(req.body);

            const employee = await employeeService.create(validatedData as any);
            res.status(201).json({
                status: 'success',
                data: employee,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const employee = await employeeService.update(id, req.body);

            res.json({
                status: 'success',
                data: employee,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const employeeController = new EmployeeController();
