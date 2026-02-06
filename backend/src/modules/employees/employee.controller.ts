import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';

export class EmployeeController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const params = {
                skill: req.query.skill as string | undefined,
                minLevel: req.query.minLevel as string | undefined,
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
                res.status(404).json({
                    status: 'error',
                    message: 'Employee not found',
                });
                return;
            }

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
