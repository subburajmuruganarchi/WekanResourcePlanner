import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2, Flag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/lib/use-projects';
import { PROJECT_STATUS_OPTIONS, projectStatusOf } from '@/lib/project-status';
import type { ProjectStatus } from '@/types/api';
import { LeadershipFieldCard } from './leadership-field-card';

interface ProjectStatusAssignmentProps {
    projectId: string;
    status: ProjectStatus | string;
    readOnly?: boolean;
    onUpdated?: () => void;
    variant?: 'default' | 'card';
    icon?: LucideIcon;
    hint?: string;
}

const fieldLabelClass =
    'text-xs font-semibold text-gray-500 uppercase tracking-wide';

export function ProjectStatusAssignment({
    projectId,
    status,
    readOnly = false,
    onUpdated,
    variant = 'default',
    icon: Icon = Flag,
    hint,
}: ProjectStatusAssignmentProps) {
    const { updateProject } = useProjects();
    const canonical = projectStatusOf({ status: status as ProjectStatus });
    const [selected, setSelected] = useState<ProjectStatus>(canonical);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelected(projectStatusOf({ status: status as ProjectStatus }));
        setSaved(false);
        setError(null);
    }, [status, projectId]);

    const hasChanges = !readOnly && selected !== canonical;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateProject(projectId, { status: selected });
            setSaved(true);
            onUpdated?.();
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    const control = readOnly ? (
        <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800">
            {PROJECT_STATUS_OPTIONS.find((o) => o.value === canonical)?.label ?? canonical}
        </div>
    ) : (
        <Select value={selected} onValueChange={(v: ProjectStatus) => setSelected(v)}>
            <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm">
                <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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
            disabled={!hasChanges || saving}
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
                title="Project Status"
                hint={hint}
                error={error}
                action={saveButton}
            >
                {control}
            </LeadershipFieldCard>
        );
    }

    return (
        <div className="min-w-0 space-y-2">
            <label className={fieldLabelClass}>Project Status</label>
            {control}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {!readOnly && saveButton}
        </div>
    );
}
