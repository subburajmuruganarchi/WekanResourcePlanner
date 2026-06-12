import { Employee } from '../../modules/employees/employee.model';
import { EmployeeSkill } from '../../modules/employees/employee-skill.model';
import { Project } from '../../modules/projects/project.model';
import { ImportContext } from './types/import-context.types';

/** Rebuild in-memory lookup maps from MongoDB (for standalone Project/Allocation sheet sync). */
export async function hydrateContextFromDatabase(ctx: ImportContext): Promise<void> {
    const employees = await Employee.find({})
        .select('email employee_code _id')
        .lean();

    for (const emp of employees) {
        ctx.employeeByEmail.set(emp.email.toLowerCase(), emp._id);
        if (emp.employee_code) {
            ctx.employeeByCode.set(emp.employee_code.toUpperCase(), emp._id);
        }
    }

    const projects = await Project.find({})
        .select('project_code _id')
        .lean();

    for (const proj of projects) {
        ctx.projectByCode.set(proj.project_code, proj._id);
        const pidMatch = proj.project_code.match(/^WK-(P\d+)$/i);
        if (pidMatch) {
            ctx.projectByPid.set(pidMatch[1].toUpperCase(), proj.project_code);
        }
    }

    const skills = await EmployeeSkill.find({ is_primary: true })
        .select('employee_id skill_id')
        .lean();
    for (const es of skills) {
        ctx.employeePrimarySkill.set(es.employee_id.toString(), es.skill_id);
    }
}
