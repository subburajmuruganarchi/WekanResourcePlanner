/** Keep in sync with backend auth-user.util normalizeRoleName */
export function normalizeRoleName(role: string): string {
    if (role === 'ProjectManager') return 'Project Manager';
    return role;
}
