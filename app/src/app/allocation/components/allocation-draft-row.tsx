import { Button } from '@/components/ui/button';
import type { EmployeeOption, ProjectOption } from './allocation-weekly-grid';

export interface AllocationDraftRowProps {
    open: boolean;
    projects: ProjectOption[];
    employees: EmployeeOption[];
    projectId: string;
    employeeId: string;
    error: string | null;
    saving: boolean;
    onProjectChange: (projectId: string) => void;
    onEmployeeChange: (employeeId: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function AllocationDraftRow({
    open,
    projects,
    employees,
    projectId,
    employeeId,
    error,
    saving,
    onProjectChange,
    onEmployeeChange,
    onSave,
    onCancel,
}: AllocationDraftRowProps) {
    if (!open) return null;

    const selectedEmployee = employees.find((e) => e.id === employeeId);

    return (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">New allocation row</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Select project and resource, then save to add the row to the table.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="bg-brand-500 hover:bg-brand-600"
                        onClick={onSave}
                        disabled={saving || !projectId || !employeeId}
                    >
                        {saving ? 'Saving…' : 'Save row'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                    <span className="text-xs font-medium text-gray-700">Project</span>
                    <select
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                        value={projectId}
                        onChange={(e) => onProjectChange(e.target.value)}
                    >
                        <option value="">Select project…</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="text-xs font-medium text-gray-700">Resource</span>
                    <select
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                        value={employeeId}
                        onChange={(e) => onEmployeeChange(e.target.value)}
                        disabled={!projectId}
                    >
                        <option value="">Select resource…</option>
                        {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="text-xs font-medium text-gray-700">Resource role</span>
                    <div className="h-9 flex items-center rounded-lg border border-gray-100 bg-gray-50 px-2 text-sm text-gray-600">
                        {selectedEmployee?.role || '—'}
                    </div>
                </label>
            </div>

            {error && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}
        </div>
    );
}
