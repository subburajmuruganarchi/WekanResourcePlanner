import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from './employee.schema';
import { UpdateEmployeeRoleSchema } from './update-role.schema';
import { AppError } from '../../common/errors/app-error';
import { Employee } from './employee.model';
import { Role } from '../roles/role.model';
import { Types } from 'mongoose';
import { getAuthEmployeeId } from '../../common/utils/auth-user.util';

export class EmployeeController {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const params = {
                skill: req.query.skill as string | undefined,
                minLevel: req.query.minLevel as string | undefined,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
            };

            const user = req.user;
            const allocatedToMyProjects = req.query.allocatedToMyProjects === 'true';

            let employees;
            if (allocatedToMyProjects && user?.role === 'Project Manager') {
                const pmEmployeeId = getAuthEmployeeId(user);
                if (!pmEmployeeId) {
                    res.status(401).json({ status: 'error', message: 'Authentication required.' });
                    return;
                }
                employees = await employeeService.findAllocatedToProjectManager(pmEmployeeId, params);
            } else {
                employees = await employeeService.findAll(params);
            }

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
            // Validate request body against update schema to prevent arbitrary field injection
            const validatedData = UpdateEmployeeSchema.parse(req.body);
            const employee = await employeeService.update(id, validatedData);

            res.json({
                status: 'success',
                data: employee,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { role_id, is_active } = UpdateEmployeeRoleSchema.parse(req.body);

            if (!Types.ObjectId.isValid(id)) {
                throw new AppError('Invalid employee ID', 400);
            }

            // Validate role exists
            if (!Types.ObjectId.isValid(role_id)) {
                throw new AppError('Invalid role ID', 400);
            }
            const roleExists = await Role.findById(role_id);
            if (!roleExists) {
                throw new AppError('Role not found', 404);
            }

            const updateData: any = { role_id };
            if (typeof is_active === 'boolean') {
                updateData.is_active = is_active;
                updateData.status = is_active ? 'Active' : 'Inactive';
            }

            const employee = await Employee.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            ).populate('role_id', 'role_name');

            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            res.json({
                status: 'success',
                data: {
                    id: employee._id,
                    email: employee.email,
                    role: (employee.role_id as any)?.role_name,
                    is_active: employee.is_active,
                }
            });
        } catch (error) {
            next(error);
        }
    }
    async updateAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            if (typeof is_active !== 'boolean') {
                throw new AppError('is_active must be a boolean', 400);
            }

            if (!Types.ObjectId.isValid(id)) {
                throw new AppError('Invalid employee ID', 400);
            }

            const employee = await Employee.findByIdAndUpdate(
                id,
                { is_active, status: is_active ? 'Active' : 'Inactive' },
                { new: true }
            ).populate('role_id', 'role_name');

            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            res.json({
                status: 'success',
                data: {
                    id: employee._id,
                    email: employee.email,
                    role: (employee.role_id as any)?.role_name,
                    is_active: employee.is_active,
                    status: employee.status,
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export const employeeController = new EmployeeController();
