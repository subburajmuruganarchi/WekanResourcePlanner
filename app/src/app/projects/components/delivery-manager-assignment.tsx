import { useEffect, useMemo, useState } from 'react';
import { Loader2, Briefcase, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useEmployees } from '@/lib/use-employees';
import { normalizeRoleName } from '@/lib/role-utils';
import { PROJECTS_CHANGED_EVENT } from '@/lib/use-projects';

interface DeliveryManagerAssignmentProps {
    projectId: string;
    managerIds?: string[];
    managerNames?: string[];
    readOnly?: boolean;
    onUpdated?: () => void;
}

const fieldLabelClass =
    'text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5';

export function DeliveryManagerAssignment({
    projectId,
    managerIds = [],
    managerNames = [],
    readOnly = false,
    onUpdated,
}: DeliveryManagerAssignmentProps) {
    const { employees, loading: employeesLoading } = useEmployees();
    const [selectedManagerId, setSelectedManagerId] = useState(managerIds[0] || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedManagerId(managerIds[0] || '');
        setSaved(false);
        setError(null);
    }, [managerIds, projectId]);

    const deliveryManagers = useMemo(
        () =>
            employees.filter((emp) => normalizeRoleName(emp.role || '') === 'Delivery Manager'),
        [employees]
    );

    const hasChanges = !readOnly && selectedManagerId !== (managerIds[0] || '');

    const displayName = useMemo(() => {
        if (managerNames.length > 0) return managerNames.join(', ');
        if (managerIds[0]) {
            const match = deliveryManagers.find((emp) => emp.id === managerIds[0]);
            if (match) return match.name;
        }
        return 'Unassigned';
    }, [managerNames, managerIds, deliveryManagers]);

    const handleSave = async () => {
        if (!selectedManagerId) {
            setError('Select a delivery manager.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await api.post('/delivery-portfolios/assign-delivery-manager', {
                projectId,
                managerId: selectedManagerId,
            });
            setSaved(true);
            window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT));
            onUpdated?.();
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to assign delivery manager');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-2 min-w-0">
                <label className={fieldLabelClass}>
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    Delivery Manager
                </label>
                {readOnly ? (
                    <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700">
                        {displayName}
                    </div>
                ) : employeesLoading ? (
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                    </div>
                ) : deliveryManagers.length === 0 ? (
                    <p className="flex min-h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs text-amber-800">
                        No DM users — assign role in User Control
                    </p>
                ) : (
                    <Select
                        key={`dm-select-${projectId}`}
                        value={selectedManagerId}
                        onValueChange={setSelectedManagerId}
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 text-sm">
                            <SelectValue placeholder="Assign delivery manager…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 rounded-xl">
                            {deliveryManagers.map((emp) => (
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
                        disabled={
                            !hasChanges || saving || !selectedManagerId || deliveryManagers.length === 0
                        }
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
                            'Save DM'
                        )}
                    </Button>
                </div>
            )}
        </>
    );
}
