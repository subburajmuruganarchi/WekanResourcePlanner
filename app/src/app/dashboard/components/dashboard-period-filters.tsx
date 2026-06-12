import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    type DashboardPeriodMode,
    formatDashboardPeriodLabel,
    getCurrentMonthValue,
    getCurrentWeekStart,
    snapToMonday,
    type DashboardPeriodRange,
} from '@/lib/dashboard-period';

interface DashboardPeriodFiltersProps {
    mode: DashboardPeriodMode;
    weekStart: string;
    monthValue: string;
    range: DashboardPeriodRange;
    onModeChange: (mode: DashboardPeriodMode) => void;
    onWeekChange: (weekStart: string) => void;
    onMonthChange: (monthValue: string) => void;
}

export function DashboardPeriodFilters({
    mode,
    weekStart,
    monthValue,
    range,
    onModeChange,
    onWeekChange,
    onMonthChange,
}: DashboardPeriodFiltersProps) {
    const periodLabel = formatDashboardPeriodLabel(mode, range, monthValue);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 shrink-0">
                    <CalendarRange className="w-4 h-4 text-brand-600" />
                    Reporting period
                </div>

                <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                    {(['week', 'month'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => onModeChange(m)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                mode === m
                                    ? 'bg-white text-brand-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {m === 'week' ? 'Week' : 'Month'}
                        </button>
                    ))}
                </div>

                {mode === 'week' ? (
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Week starting</Label>
                        <Input
                            type="date"
                            className="w-[170px]"
                            value={weekStart}
                            onChange={(e) => onWeekChange(snapToMonday(e.target.value))}
                        />
                    </div>
                ) : (
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Month</Label>
                        <Input
                            type="month"
                            className="w-[170px]"
                            value={monthValue}
                            onChange={(e) => onMonthChange(e.target.value)}
                        />
                    </div>
                )}

                <div className="flex flex-wrap gap-2 xl:ml-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onModeChange('week');
                            onWeekChange(getCurrentWeekStart());
                        }}
                    >
                        This week
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onModeChange('month');
                            onMonthChange(getCurrentMonthValue());
                        }}
                    >
                        This month
                    </Button>
                </div>
            </div>

            <p className="text-sm text-gray-600 border-t border-gray-100 pt-3">
                Viewing <span className="font-semibold text-gray-900">{periodLabel}</span>
                <span className="text-gray-400 mx-2">·</span>
                Planned vs actual, allocations, and logged hours update with this period.
            </p>
        </div>
    );
}
