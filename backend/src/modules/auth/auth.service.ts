import bcrypt from 'bcryptjs';
import { Employee } from '../employees/employee.model';
import { generateToken, TokenPayload } from '../../common/utils/jwt.utils';
import { IRole } from '../roles/role.model';
import { AppError } from '../../common/errors/app-error';

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
}
