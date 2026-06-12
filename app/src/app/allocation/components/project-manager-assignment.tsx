import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserCog, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/lib/use-employees';
import { useProjects } from '@/lib/use-projects';
import { normalizeRoleName } from '@/lib/role-utils';

interface ProjectManagerAssignmentProps {
    projectId: string;
    managerId?: string;
    managerName?: string;
    readOnly?: boolean;
    onUpdated?: () => void;
}

const fieldLabelClass =
    'text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5';

export function ProjectManagerAssignment({
    projectId,
    managerId,
    managerName,
    readOnly = false,
    onUpdated,
}: ProjectManagerAssignmentProps) {
    const { employees, loading: employeesLoading } = useEmployees();
    const { updateProject } = useProjects();
    const [selectedManagerId, setSelectedManagerId] = useState(managerId || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedManagerId(managerId || '');
        setSaved(false);
        setError(null);
    }, [managerId, projectId]);

    const projectManagers = useMemo(
        () =>
            employees.filter((emp) => {
                const accessRole = normalizeRoleName(emp.role || '');
                return accessRole === 'Project Manager' || accessRole === 'Admin';
            }),
        [employees]
    );

    const hasChanges = !readOnly && selectedManagerId !== (managerId || '');

    const displayManagerName = useMemo(() => {
        if (managerName) return managerName;
        if (managerId) {
            const match = projectManagers.find((emp) => emp.id === managerId);
            if (match) return match.name;
        }
        return 'Unassigned';
    }, [managerName, managerId, projectManagers]);

    const handleSave = async () => {
        if (!selectedManagerId) {
            setError('Select a project manager.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await updateProject(projectId, { managerId: selectedManagerId });
            setSaved(true);
            onUpdated?.();
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update project manager');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-2 min-w-0">
                <label className={fieldLabelClass}>
                    <UserCog className="w-3.5 h-3.5 shrink-0" />
                    Project Manager
                </label>
                {readOnly ? (
                    <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700">
                        {displayManagerName}
                    </div>
                ) : employeesLoading ? (
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                    </div>
                ) : projectManagers.length === 0 ? (
                    <p className="flex min-h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs text-amber-800">
                        No PM users — assign role in User Control
                    </p>
                ) : (
                    <Select
                        key={`pm-select-${projectId}`}
                        value={selectedManagerId}
                        onValueChange={setSelectedManagerId}
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 text-sm">
                            <SelectValue placeholder="Assign project manager…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 rounded-xl">
                            {projectManagers.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.role ? `${emp.name} (${emp.role})` : emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            {!readOnly && (
                <div className="space-y-2 min-w-0">
                    <span className={`${fieldLabelClass} invisible select-none`} aria-hidden>
                        Action
                    </span>
                    <Button
                        type="button"
                        variant={hasChanges ? 'default' : 'outline'}
                        className="h-11 w-full rounded-xl px-5 sm:w-auto"
                        disabled={!hasChanges || saving || !selectedManagerId || projectManagers.length === 0}
                        onClick={() => void handleSave()}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <>
                                <Check className="mr-1.5 h-4 w-4" />
                                Saved
                            </>
                        ) : (
                            'Save PM'
                        )}
                    </Button>
                </div>
            )}
        </>
    );
}
