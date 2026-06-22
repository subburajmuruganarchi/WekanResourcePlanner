/** Display label for sheet "Project Type" (Customer, Internal, Projected). */
export function projectTypeLabel(type?: string, billingType?: string): string {
    const trimmed = type?.trim();
    if (trimmed) return trimmed;
    if (billingType === 'Non-billable') return 'Internal';
    if (billingType === 'Billable') return 'Customer';
    return '—';
}
