import { Save, Send, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { TimesheetStatus } from './types';

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    partial: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    submitted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
    empty: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

interface TimeHeaderProps {
    employeeName: string;
    isSelfOnly: boolean;
    employees: { id: string; name: string }[];
    selectedEmployeeId: string;
    onEmployeeChange: (id: string) => void;
    loadingEmployees: boolean;
    weekTimesheetStatus: TimesheetStatus;
    isTimesheetLocked: boolean;
    loading: boolean;
    canSubmit: boolean;
    dirtyCount: number;
    onSaveDraft: () => void;
    onSubmit: () => void;
    onCopyPreviousWeek: () => void;
    onExport: () => void;
    isProjectManager?: boolean;
}

export function TimeHeader({
    employeeName,
    isSelfOnly,
    employees,
    selectedEmployeeId,
    onEmployeeChange,
    loadingEmployees,
    weekTimesheetStatus,
    isTimesheetLocked,
    loading,
    canSubmit,
    dirtyCount,
    onSaveDraft,
    onSubmit,
    onCopyPreviousWeek,
    onExport,
    isProjectManager,
}: TimeHeaderProps) {
    const statusLabel =
        weekTimesheetStatus === 'approved'
            ? 'Approved'
            : weekTimesheetStatus === 'submitted'
              ? 'Submitted'
              : weekTimesheetStatus === 'rejected'
                ? 'Rejected'
                : weekTimesheetStatus === 'partial'
                  ? 'Partial'
                  : 'Draft';

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Time Intelligence
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 max-w-xl">
                        Track project effort, utilization, and delivery progress.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Employee</span>
                            {isSelfOnly ? (
                                <span className="font-medium text-slate-900">{employeeName}</span>
                            ) : loadingEmployees ? (
                                <span className="text-slate-400">Loading…</span>
                            ) : employees.length === 0 ? (
                                <span className="text-slate-400">No employees</span>
                            ) : (
                                <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
                                    <SelectTrigger className="h-8 w-[200px] border-slate-200">
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[weekTimesheetStatus] ?? STATUS_STYLES.draft}`}
                        >
                            {statusLabel}
                        </span>
                        {isProjectManager && (
                            <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                                Manager view
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {!isTimesheetLocked && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={onSaveDraft}
                                disabled={loading || dirtyCount === 0}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-1.5" />
                                )}
                                Save Draft{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={onCopyPreviousWeek}
                                disabled={loading || isTimesheetLocked}
                            >
                                <Copy className="w-4 h-4 mr-1.5" />
                                Copy Previous Week
                            </Button>
                        </>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={onExport}
                    >
                        <Download className="w-4 h-4 mr-1.5" />
                        Export
                    </Button>
                    {!isTimesheetLocked && (
                        <Button
                            type="button"
                            size="sm"
                            className="h-9 enterprise-gradient-bg text-white border-0 hover:opacity-95"
                            onClick={onSubmit}
                            disabled={loading || !canSubmit}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-1.5" />
                            )}
                            Submit Timesheet
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
