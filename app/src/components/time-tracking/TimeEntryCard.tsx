import { cn } from '@/lib/utils';
import { projectChipColor } from '@/components/time-entry/project-color';
import { Badge } from '@/components/ui/badge';
import type { DayEntry, ProjectOption } from '@/components/time-entry/time-entry-types';

interface TimeEntryCardProps {
    entry: DayEntry;
    projects: ProjectOption[];
    disabled?: boolean;
    onClick: () => void;
}

function projectNameForCode(code: string, projects: ProjectOption[]): string {
    const p = projects.find((x) => x.code === code);
    if (p) return p.name;
    if (code.startsWith('LV-')) return code.replace('LV-', '') + ' Leave';
    return code;
}

export function TimeEntryCard({ entry, projects, disabled, onClick }: TimeEntryCardProps) {
    const locked = entry.status === 'Submitted' || entry.status === 'PM_Approved';
    const task = entry.comments?.trim() || 'General work';

    return (
        <button
            type="button"
            disabled={disabled && locked}
            onClick={onClick}
            className={cn(
                'w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm',
                projectChipColor(entry.projectCode),
                locked && 'opacity-85'
            )}
        >
            <p className="text-xs font-semibold truncate">
                {projectNameForCode(entry.projectCode, projects)}
            </p>
            <p className="text-[10px] opacity-80 truncate mt-0.5">{task}</p>
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm font-bold tabular-nums">{entry.hours}h</span>
                {entry.status && entry.status !== 'Draft' && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {entry.status === 'PM_Approved' ? 'Approved' : entry.status}
                    </Badge>
                )}
            </div>
        </button>
    );
}
