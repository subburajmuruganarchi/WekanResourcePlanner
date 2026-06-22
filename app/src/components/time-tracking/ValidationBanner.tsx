import { AlertTriangle } from 'lucide-react';

interface ValidationBannerProps {
    missingWeekdays: string[];
    remainingHours: number;
}

export function ValidationBanner({ missingWeekdays, remainingHours }: ValidationBannerProps) {
    if (missingWeekdays.length === 0) return null;

    const recommended = missingWeekdays.slice(0, 2).join(' and ');

    return (
        <div
            className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex gap-3"
            role="alert"
        >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-amber-900">Timesheet incomplete</p>
                <p className="text-sm text-amber-800 mt-0.5">
                    You have {remainingHours} missing hour{remainingHours === 1 ? '' : 's'}.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                    Recommended: complete {recommended}
                    {missingWeekdays.length > 2
                        ? ` and ${missingWeekdays.length - 2} more day${missingWeekdays.length - 2 === 1 ? '' : 's'}`
                        : ''}{' '}
                    entries.
                </p>
            </div>
        </div>
    );
}
