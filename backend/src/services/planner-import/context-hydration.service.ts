import { Employee } from '../../modules/employees/employee.model';
import { EmployeeSkill } from '../../modules/employees/employee-skill.model';
import { Project } from '../../modules/projects/project.model';
import { ImportContext } from './types/import-context.types';
import { ImportWriteOptions } from './types/import-write.options';
import { employeeCodeLookupKeys } from './planner-import.utils';

/** Rebuild in-memory lookup maps from MongoDB (for standalone Project/Allocation sheet sync). */
export async function hydrateContextFromDatabase(
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<void> {
    let employeesQuery = Employee.find({}).select('email employee_code _id');
    let projectsQuery = Project.find({}).select('project_code _id');
    let skillsQuery = EmployeeSkill.find({ is_primary: true }).select('employee_id skill_id');
    if (writeOpts?.session) {
        employeesQuery = employeesQuery.session(writeOpts.session);
        projectsQuery = projectsQuery.session(writeOpts.session);
        skillsQuery = skillsQuery.session(writeOpts.session);
    }
    const employees = await employeesQuery.lean();

    for (const emp of employees) {
        ctx.employeeByEmail.set(emp.email.toLowerCase(), emp._id);
        if (emp.employee_code) {
            for (const key of employeeCodeLookupKeys(emp.employee_code)) {
                ctx.employeeByCode.set(key, emp._id);
            }
        }
    }

    const projects = await projectsQuery.lean();

    for (const proj of projects) {
        ctx.projectByCode.set(proj.project_code, proj._id);
        const pidMatch = proj.project_code.match(/^WK-(P\d+)$/i);
        if (pidMatch) {
            ctx.projectByPid.set(pidMatch[1].toUpperCase(), proj.project_code);
        }
    }

    const skills = await skillsQuery.lean();
    for (const es of skills) {
        ctx.employeePrimarySkill.set(es.employee_id.toString(), es.skill_id);
    }
}
