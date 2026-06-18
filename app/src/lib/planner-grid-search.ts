export function matchesPlannerGridSearch(
    row: {
        projectName: string;
        employeeName: string;
        employeeRole?: string;
    },
    search: { project?: string; resource?: string; role?: string }
): boolean {
    const projectQ = search.project?.trim().toLowerCase() ?? '';
    const resourceQ = search.resource?.trim().toLowerCase() ?? '';
    const roleQ = search.role?.trim().toLowerCase() ?? '';

    if (projectQ && !row.projectName.toLowerCase().includes(projectQ)) return false;
    if (resourceQ && !row.employeeName.toLowerCase().includes(resourceQ)) return false;
    if (roleQ && !(row.employeeRole ?? '').toLowerCase().includes(roleQ)) return false;
    return true;
}
