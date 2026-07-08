/** Mirrors backend activeEmployeeMongoFilter — only "Not Available" (and explicit inactive) are excluded. */
export function isActiveRosterMember(emp: {
    is_active?: boolean;
    status?: string;
}): boolean {
    if (emp.is_active === false) return false;
    const normalized = (emp.status ?? '').trim().toLowerCase();
    if (/^(inactive|terminated|not available|unavailable)$/.test(normalized)) return false;
    return true;
}
