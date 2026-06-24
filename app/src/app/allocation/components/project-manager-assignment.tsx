import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
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
import { LeadershipFieldCard } from '@/app/projects/components/leadership-field-card';

interface ProjectManagerAssignmentProps {
    projectId: string;
    managerId?: string;
    managerName?: string;
    readOnly?: boolean;
    onUpdated?: () => void;
    variant?: 'default' | 'card';
    icon?: LucideIcon;
    hint?: string;
}

const fieldLabelClass =
    'text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5';

export function ProjectManagerAssignment({
    projectId,
    managerId,
    managerName,
    readOnly = false,
    onUpdated,
    variant = 'default',
    icon: Icon = UserCog,
    hint,
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

    const control = readOnly ? (
        <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800">
            {displayManagerName}
        </div>
    ) : employeesLoading ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
        </div>
    ) : projectManagers.length === 0 ? (
        <p className="flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs text-amber-800">
            No PM users — assign role in User Control
        </p>
    ) : (
        <Select
            key={`pm-select-${projectId}`}
            value={selectedManagerId}
            onValueChange={setSelectedManagerId}
        >
            <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm">
                <SelectValue placeholder="Select project manager" />
            </SelectTrigger>
            <SelectContent className="max-h-64 rounded-lg">
                {projectManagers.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                        {emp.role ? `${emp.name} (${emp.role})` : emp.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const saveButton = !readOnly ? (
        <Button
            type="button"
            size="sm"
            variant={hasChanges ? 'default' : 'outline'}
            className="h-9 w-full rounded-lg"
            disabled={!hasChanges || saving || !selectedManagerId || projectManagers.length === 0}
            onClick={() => void handleSave()}
        >
            {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
                <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Saved
                </>
            ) : (
                'Save changes'
            )}
        </Button>
    ) : null;

    if (variant === 'card') {
        return (
            <LeadershipFieldCard
                icon={Icon}
                title="Project Manager"
                hint={hint}
                error={error}
                action={saveButton}
            >
                {control}
            </LeadershipFieldCard>
        );
    }

    return (
        <>
            <div className="min-w-0 space-y-2">
                <label className={fieldLabelClass}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    Project Manager
                </label>
                {control}
                {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            {!readOnly && saveButton && (
                <div className="min-w-0 space-y-2">
                    <span className={`${fieldLabelClass} invisible select-none`} aria-hidden>
                        Action
                    </span>
                    {saveButton}
                </div>
            )}
        </>
    );
}
