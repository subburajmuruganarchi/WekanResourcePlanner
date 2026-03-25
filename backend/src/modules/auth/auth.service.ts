import bcrypt from 'bcryptjs';
import { Employee } from '../employees/employee.model';
import { generateToken, TokenPayload } from '../../common/utils/jwt.utils';
import { IRole, Role } from '../roles/role.model';
// Side-effect import might also be needed if purely for registration,
// but since we keep the Role name here it is better to have it explicitly.
import { AppError } from '../../common/errors/app-error';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthService {
    async login(email: string, passwordString: string): Promise<{ token: string; user: any }> {
        const employee = await Employee.findOne({ email }).select('+password').populate<{ role_id: IRole }>('role_id');

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
        const roleName = employee.role_id ? employee.role_id.role_name : 'User';

        const payload: TokenPayload = {
            employeeId: employee._id.toString(),
            email: employee.email,
            role: roleName,
        };

        const token = generateToken(payload);

        return {
            token,
            user: {
                id: employee._id,
                email: employee.email,
                firstName: employee.first_name,
                lastName: employee.last_name,
                role: roleName,
            }
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
            const employee = await Employee.findOne({ email }).populate<{ role_id: IRole }>('role_id');

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

            const roleName = employee.role_id ? employee.role_id.role_name : 'User';

            const payload: TokenPayload = {
                employeeId: employee._id.toString(),
                email: employee.email,
                role: roleName,
            };

            const token = generateToken(payload);

            return {
                token,
                user: {
                    id: employee._id,
                    email: employee.email,
                    firstName: employee.first_name,
                    lastName: employee.last_name,
                    role: roleName,
                }
            };
        } catch (error: any) {
            console.error('Google login error:', error);
            if (error instanceof AppError) throw error;
            throw new AppError('Google authentication failed.', 401);
        }
    }
}
