import bcrypt from 'bcryptjs';
import { Employee } from '../employees/employee.model';
import { generateToken, TokenPayload } from '../../common/utils/jwt.utils';
import { IRole, Role } from '../roles/role.model';
// Side-effect import might also be needed if purely for registration,
// but since we keep the Role name here it is better to have it explicitly.
import { AppError } from '../../common/errors/app-error';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { normalizeRoleName } from '../../common/utils/auth-user.util';
import { IEmployee } from '../employees/employee.model';
import { generateTempPassword } from '../../common/utils/password.util';
import { ChangePasswordInput } from './password.schema';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

type PopulatedEmployee = IEmployee & {
    role_id?: IRole;
    job_role_id?: { role_name: string } | null;
};

function mapEmployeeToAuthUser(employee: PopulatedEmployee, roleName: string) {
    const jobRoleDoc = employee.job_role_id as { role_name?: string } | undefined;
    const jobRole = jobRoleDoc?.role_name?.trim();

    return {
        id: employee._id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: roleName,
        jobRole: jobRole || undefined,
        position: employee.position?.trim() || undefined,
        passwordMustChange: employee.password_must_change === true,
    };
}

export class AuthService {
    async login(email: string, passwordString: string): Promise<{ token: string; user: any }> {
        const employee = await Employee.findOne({ email })
            .select('+password')
            .populate<{ role_id: IRole }>('role_id')
            .populate('job_role_id', 'role_name') as PopulatedEmployee | null;

        if (!employee || !employee.password) {
            throw new AppError('Invalid email or password.', 401);
        }

        const isPasswordValid = await bcrypt.compare(passwordString, employee.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid email or password.', 401);
        }

        if (!employee.is_active) {
            throw new AppError('Employee account is deactivated.', 403);
        }

        // Default to 'User' if no role assigned
        const roleName = normalizeRoleName(employee.role_id ? employee.role_id.role_name : 'User');

        const payload: TokenPayload = {
            employeeId: employee._id.toString(),
            email: employee.email,
            role: roleName,
        };

        const token = generateToken(payload);

        return {
            token,
            user: mapEmployeeToAuthUser(employee, roleName),
        };
    }

    async googleLogin(idToken: string): Promise<{ token: string; user: any }> {
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: env.GOOGLE_CLIENT_ID,
            });
            const info = ticket.getPayload();

            if (!info || !info.email) {
                throw new AppError('Invalid Google token.', 401);
            }

            const email = info.email.toLowerCase().trim();
            const employee = await Employee.findOne({ email })
                .populate<{ role_id: IRole }>('role_id')
                .populate('job_role_id', 'role_name') as PopulatedEmployee | null;

            if (!employee) {
                throw new AppError('Employee not found with this Google email.', 401);
            }

            if (!employee.is_active) {
                throw new AppError('Employee account is deactivated.', 403);
            }

            // Link google_id if not already linked
            if (!employee.google_id) {
                employee.google_id = info.sub;
                await employee.save();
            }

            const roleName = normalizeRoleName(employee.role_id ? employee.role_id.role_name : 'User');

            const payload: TokenPayload = {
                employeeId: employee._id.toString(),
                email: employee.email,
                role: roleName,
            };

            const token = generateToken(payload);

            return {
                token,
                user: mapEmployeeToAuthUser(employee, roleName),
            };
        } catch (error: any) {
            console.error('Google login error:', error);
            if (error instanceof AppError) throw error;
            throw new AppError('Google authentication failed.', 401);
        }
    }

    async getMe(employeeId: string) {
        const employee = await Employee.findById(employeeId)
            .populate<{ role_id: IRole }>('role_id')
            .populate('job_role_id', 'role_name') as PopulatedEmployee | null;

        if (!employee) {
            throw new AppError('Employee not found.', 404);
        }

        if (!employee.is_active) {
            throw new AppError('Employee account is deactivated.', 403);
        }

        const roleName = normalizeRoleName(employee.role_id ? employee.role_id.role_name : 'User');

        return {
            user: mapEmployeeToAuthUser(employee, roleName),
        };
    }

    async changePassword(employeeId: string, input: ChangePasswordInput): Promise<void> {
        const employee = await Employee.findById(employeeId).select('+password');
        if (!employee || !employee.password) {
            throw new AppError('Account not found or password login is not configured.', 404);
        }

        const valid = await bcrypt.compare(input.currentPassword, employee.password);
        if (!valid) {
            throw new AppError('Current password is incorrect.', 401);
        }

        if (input.currentPassword === input.newPassword) {
            throw new AppError('New password must be different from the current password.', 400);
        }

        employee.password = await bcrypt.hash(input.newPassword, 10);
        employee.password_must_change = false;
        await employee.save();
    }

    async resetEmployeePassword(employeeId: string): Promise<{ temporaryPassword: string }> {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            throw new AppError('Employee not found.', 404);
        }

        const temporaryPassword = generateTempPassword(12);
        employee.password = await bcrypt.hash(temporaryPassword, 10);
        employee.password_must_change = true;
        await employee.save();

        return { temporaryPassword };
    }
}
