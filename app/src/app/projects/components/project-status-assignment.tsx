import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
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

interface ProjectStatusAssignmentProps {
    projectId: string;
    status: ProjectStatus | string;
    readOnly?: boolean;
    onUpdated?: () => void;
}

const fieldLabelClass =
    'text-xs font-semibold text-gray-500 uppercase tracking-wide';

export function ProjectStatusAssignment({
    projectId,
    status,
    readOnly = false,
    onUpdated,
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

    return (
        <div className="space-y-2 min-w-0">
            <label className={fieldLabelClass}>Project Status</label>
            {readOnly ? (
                <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700">
                    {PROJECT_STATUS_OPTIONS.find((o) => o.value === canonical)?.label ?? canonical}
                </div>
            ) : (
                <Select value={selected} onValueChange={(v: ProjectStatus) => setSelected(v)}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {PROJECT_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {!readOnly && (
                <Button
                    type="button"
                    variant={hasChanges ? 'default' : 'outline'}
                    className="h-11 w-full rounded-xl px-5 sm:w-auto"
                    disabled={!hasChanges || saving}
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
                        'Save status'
                    )}
                </Button>
            )}
        </div>
    );
}
