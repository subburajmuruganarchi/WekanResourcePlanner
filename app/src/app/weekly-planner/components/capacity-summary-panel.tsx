import { format, parseISO } from 'date-fns';
import type { WeeklyCapacitySummary } from '@/types/weekly-allocation';
import type { Employee } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Coffee, CalendarDays } from 'lucide-react';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';

interface CapacitySummaryPanelProps {
    summaries: WeeklyCapacitySummary[];
    employees?: Employee[];
    weeks?: string[];
    selectedEmployeeId?: string;
    selectedEmployeeName?: string;
    selectedWeekStart?: string;
    onWeekChange?: (week: string) => void;
    loading?: boolean;
}

function formatHours(n: number): string {
    return `${Math.round(n).toLocaleString()}h`;
}

function formatWeekLabel(weekStart: string): string {
    try {
        return format(parseISO(weekStart), 'MMM d, yyyy');
    } catch {
        return weekStart;
    }
}

function resolveEmployeeName(
    summary: WeeklyCapacitySummary,
    employees?: Employee[]
): string {
    if (summary.employeeName?.trim()) return summary.employeeName.trim();
    const match = employees?.find((e) => e.id === summary.employeeId);
    if (match?.name?.trim()) return match.name.trim();
    return summary.employeeId.slice(0, 8) + '…';
}

export function CapacitySummaryPanel({
    summaries,
    employees,
    weeks = [],
    selectedEmployeeId,
    selectedEmployeeName,
    selectedWeekStart,
    onWeekChange,
    loading,
}: CapacitySummaryPanelProps) {
    const filtered = summaries.filter((s) => {
        if (selectedEmployeeId && s.employeeId !== selectedEmployeeId) return false;
        if (selectedWeekStart && s.weekStart !== selectedWeekStart) return false;
        return true;
    });

    const aggregate = filtered.length
        ? filtered.reduce(
              (acc, s) => ({
                  committed: acc.committed + s.committedHours,
                  available: acc.available + s.availableHours,
                  capacity: acc.capacity + s.capacityHours,
                  over: acc.over + (s.isOverAllocated ? 1 : 0),
                  employeeWeeks: acc.employeeWeeks + 1,
              }),
              { committed: 0, available: 0, capacity: 0, over: 0, employeeWeeks: 0 }
          )
        : null;

    const totalPlanned = filtered.reduce((s, x) => s + x.plannedHours, 0);
    const totalActual = filtered.reduce((s, x) => s + x.actualHours, 0);
    const planVariance = Math.round((totalPlanned - totalActual) * 10) / 10;

    const avgUtil =
        aggregate && aggregate.capacity > 0
            ? Math.round((aggregate.committed / aggregate.capacity) * 10000) / 100
            : 0;
    const avgActualUtil =
        aggregate && aggregate.capacity > 0
            ? Math.round((totalActual / aggregate.capacity) * 10000) / 100
            : 0;
    const avgBench =
        aggregate && aggregate.capacity > 0
            ? Math.round((aggregate.available / aggregate.capacity) * 10000) / 100
            : 0;

    const topItems = [...filtered]
        .sort(
            (a, b) =>
                Number(b.isOverAllocated) - Number(a.isOverAllocated) ||
                b.committedHours - a.committedHours
        )
        .slice(0, 8);

    const scopeLabel = selectedEmployeeId
        ? selectedEmployeeName || 'Selected resource'
        : selectedWeekStart
          ? `Week of ${formatWeekLabel(selectedWeekStart)}`
          : 'All resources & weeks in range';

    return (
        <Card className="border-gray-200 shadow-sm h-fit">
            <CardHeader className="pb-3 space-y-3">
                <div>
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-600 shrink-0" />
                        Capacity summary
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Rolls up planned hours per person per week ({DEFAULT_WEEKLY_CAPACITY_HOURS}h
                        standard capacity) and compares to approved actuals.
                    </p>
                </div>

                {weeks.length > 1 && onWeekChange && (
                    <div>
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <CalendarDays className="w-3 h-3" />
                            Focus week
                        </label>
                        <select
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                            value={selectedWeekStart ?? ''}
                            onChange={(e) => onWeekChange(e.target.value)}
                        >
                            <option value="">All weeks</option>
                            {weeks.map((w) => (
                                <option key={w} value={w}>
                                    {formatWeekLabel(w)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {aggregate && !loading && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1.5">
                        Viewing: <span className="font-medium text-gray-800">{scopeLabel}</span>
                        {' · '}
                        {aggregate.employeeWeeks} employee-week
                        {aggregate.employeeWeeks === 1 ? '' : 's'}
                    </p>
                )}
            </CardHeader>

            <CardContent className="space-y-5 pt-0">
                {loading ? (
                    <p className="text-sm text-gray-500 py-2">Loading capacity…</p>
                ) : !aggregate ? (
                    <p className="text-sm text-gray-500 py-2">
                        Load the grid to see capacity metrics.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <Metric
                                label="Planned"
                                value={formatHours(aggregate.committed)}
                                sub={`${avgUtil}% of capacity`}
                            />
                            <Metric
                                label="Actual"
                                value={formatHours(totalActual)}
                                sub={
                                    totalActual === 0
                                        ? 'Use Sync actuals to populate'
                                        : `${avgActualUtil}% actual util.`
                                }
                                accent="purple"
                                muted={totalActual === 0}
                            />
                            <Metric
                                label="Plan variance"
                                value={`${planVariance >= 0 ? '+' : '−'}${Math.abs(Math.round(planVariance)).toLocaleString()}h`}
                                sub="planned − actual"
                                accent={planVariance > 4 ? 'amber' : undefined}
                            />
                            <Metric
                                label="Bench"
                                value={`${avgBench}%`}
                                sub={`${formatHours(aggregate.available)} free`}
                                accent="green"
                            />
                        </div>

                        {aggregate.over > 0 && (
                            <div className="flex items-start gap-2.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <p className="font-medium">
                                        {aggregate.over} over-allocated employee-week
                                        {aggregate.over === 1 ? '' : 's'}
                                    </p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Planned hours exceed {DEFAULT_WEEKLY_CAPACITY_HOURS}h — adjust
                                        the grid or enable over-allocation on save.
                                    </p>
                                </div>
                            </div>
                        )}

                        {totalActual === 0 && totalPlanned > 0 && (
                            <p className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
                                Actual hours are from approved time entries. Click{' '}
                                <span className="font-medium text-gray-700">Sync actuals</span> after
                                timesheets are approved to compare plan vs reality.
                            </p>
                        )}
                    </>
                )}

                {topItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                            Top commitments
                        </p>
                        <p className="text-xs text-gray-500 -mt-1">
                            Employees with the highest planned hours for the selected week or filter
                            (over-allocated weeks listed first).
                        </p>
                        <ul className="space-y-0 max-h-52 overflow-y-auto wp-capacity-scroll divide-y divide-gray-100">
                            {topItems.map((s) => (
                                <li
                                    key={`${s.employeeId}-${s.weekStart}`}
                                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 truncate text-sm">
                                            {resolveEmployeeName(s, employees)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Week of {formatWeekLabel(s.weekStart)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm tabular-nums text-gray-700 font-medium">
                                            {s.committedHours}h
                                        </span>
                                        {s.isOverAllocated ? (
                                            <Badge variant="warning" className="text-[10px] px-2">
                                                Over
                                            </Badge>
                                        ) : s.benchPercent >= 25 ? (
                                            <Badge variant="secondary" className="text-[10px] px-2 gap-1">
                                                <Coffee className="w-3 h-3" />
                                                Bench
                                            </Badge>
                                        ) : (
                                            <Badge variant="default" className="text-[10px] px-2">
                                                {s.utilizationPercent}%
                                            </Badge>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Metric({
    label,
    value,
    sub,
    accent,
    muted,
}: {
    label: string;
    value: string;
    sub: string;
    accent?: 'purple' | 'green' | 'amber';
    muted?: boolean;
}) {
    const color =
        accent === 'purple'
            ? muted
                ? 'text-gray-500'
                : 'text-purple-700'
            : accent === 'green'
              ? 'text-green-700'
              : accent === 'amber'
                ? 'text-amber-700'
                : 'text-gray-900';
    return (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 min-h-[88px] flex flex-col justify-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{sub}</p>
        </div>
    );
}
