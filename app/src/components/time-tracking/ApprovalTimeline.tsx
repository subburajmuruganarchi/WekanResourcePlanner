import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimesheetStatus } from './types';

const STEPS = [
    { id: 'draft', label: 'Draft' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'review', label: 'Manager Review' },
    { id: 'approved', label: 'Approved' },
] as const;

function activeStepIndex(status: TimesheetStatus): number {
    if (status === 'approved') return 3;
    if (status === 'submitted') return 2;
    if (status === 'rejected') return 1;
    if (status === 'partial') return 2;
    return 0;
}

interface ApprovalTimelineProps {
    status: TimesheetStatus;
}

export function ApprovalTimeline({ status }: ApprovalTimelineProps) {
    const active = activeStepIndex(status);
    const rejected = status === 'rejected';

    return (
        <div className="dashboard-card px-4 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Approval Status
            </p>
            <div className="flex items-center justify-between gap-1">
                {STEPS.map((step, i) => {
                    const done = i < active || (i === active && status === 'approved');
                    const current = i === active;
                    return (
                        <div key={step.id} className="flex flex-col items-center flex-1 min-w-0">
                            <div
                                className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors',
                                    done
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : current
                                          ? rejected
                                              ? 'border-red-500 text-red-500 bg-red-50'
                                              : 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                          : 'border-slate-200 text-slate-300 bg-white'
                                )}
                            >
                                {done ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <Circle className="w-3 h-3" />
                                )}
                            </div>
                            <p
                                className={cn(
                                    'text-[9px] font-medium mt-1.5 text-center leading-tight',
                                    current ? 'text-slate-900' : 'text-slate-400'
                                )}
                            >
                                {step.label}
                            </p>
                            {i < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'absolute hidden',
                                        done && 'bg-emerald-400'
                                    )}
                                    aria-hidden
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            {rejected && (
                <p className="text-[11px] text-red-600 mt-3 text-center">
                    Timesheet was rejected — update entries and resubmit.
                </p>
            )}
        </div>
    );
}
