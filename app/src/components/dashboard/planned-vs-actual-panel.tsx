import {

    Bar,

    BarChart,

    CartesianGrid,

    Legend,

    ResponsiveContainer,

    Tooltip,

    XAxis,

    YAxis,

} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { AlertTriangle, BarChart3 } from 'lucide-react';

import type { UtilizationDashboardSummary } from '@/types/utilization';



export interface PlannedVsActualProjectPoint {

    projectId: string;

    projectName: string;

    plannedHours: number;

    actualHours: number;

}



interface PlannedVsActualPanelProps {

    summary: UtilizationDashboardSummary | null;

    projectSeries: PlannedVsActualProjectPoint[];

    rangeLabel?: string;

    loading?: boolean;

}



/** Minimum bar width for log-scale chart (0h cannot render on log axis). */

function chartHours(hours: number): number {

    return hours > 0 ? hours : 0.5;

}



export function PlannedVsActualPanel({

    summary,

    projectSeries,

    rangeLabel,

    loading,

}: PlannedVsActualPanelProps) {

    const tableRows = projectSeries.map((p) => {

        const planned = Math.round(p.plannedHours * 10) / 10;

        const actual = Math.round(p.actualHours * 10) / 10;

        const deliveryPct =

            planned > 0 ? Math.min(999, Math.round((actual / planned) * 1000) / 10) : actual > 0 ? 100 : 0;

        return {

            projectId: p.projectId,

            projectName: p.projectName,

            planned,

            actual,

            variance: Math.round((planned - actual) * 10) / 10,

            deliveryPct,

        };

    });



    const chartData = tableRows.map((r) => ({

        project: r.projectName.length > 22 ? `${r.projectName.slice(0, 20)}…` : r.projectName,

        fullProject: r.projectName,

        planned: chartHours(r.planned),

        actual: chartHours(r.actual),

        plannedLabel: r.planned,

        actualLabel: r.actual,

    }));



    const hasActualData = tableRows.some((d) => d.actual > 0);

    const chartHeight = Math.max(220, chartData.length * 34 + 48);



    return (

        <Card className="border-gray-200 shadow-sm">

            <CardHeader className="pb-2">

                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">

                    <BarChart3 className="w-4 h-4 text-brand-600" />

                    Planned vs actual utilization

                </CardTitle>

                <p className="text-xs text-gray-500">

                    Project-level plan vs approved actuals

                    {rangeLabel ? ` · ${rangeLabel}` : ''}

                </p>

            </CardHeader>

            <CardContent className="space-y-4">

                {loading ? (

                    <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />

                ) : (

                    <>

                        {summary && (

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                                <Kpi

                                    label="Planned"

                                    value={`${Math.round(summary.totalPlannedHours)}h`}

                                />

                                <Kpi

                                    label="Actual"

                                    value={`${Math.round(summary.totalActualHours)}h`}

                                />

                                <Kpi

                                    label="Plan variance"

                                    value={`${summary.planVarianceHours >= 0 ? '+' : ''}${Math.round(summary.planVarianceHours * 10) / 10}h`}

                                    hint="plan − actual"

                                    warn={summary.planVarianceHours > 8}

                                />

                                <Kpi

                                    label="Actual util."

                                    value={`${summary.avgActualUtilizationPercent}%`}

                                    hint={`avg variance ${summary.avgVariancePercent}%`}

                                />

                            </div>

                        )}



                        {chartData.length > 0 ? (

                            <>

                                <div className="w-full" style={{ height: chartHeight }}>

                                    <ResponsiveContainer width="100%" height="100%">

                                        <BarChart

                                            layout="vertical"

                                            data={chartData}

                                            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}

                                            barCategoryGap="20%"

                                            barGap={2}

                                        >

                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />

                                            <XAxis

                                                type="number"

                                                scale="log"

                                                domain={[0.5, 'auto']}

                                                tick={{ fontSize: 10 }}

                                                tickFormatter={(v) => `${v >= 1 ? Math.round(v) : v}h`}

                                            />

                                            <YAxis

                                                type="category"

                                                dataKey="project"

                                                width={148}

                                                tick={{ fontSize: 10 }}

                                            />

                                            <Tooltip

                                                labelFormatter={(_, payload) =>

                                                    payload?.[0]?.payload?.fullProject ?? ''

                                                }

                                                formatter={(value: number, name: string, item) => {

                                                    const row = item?.payload;

                                                    const label =

                                                        name === 'Planned'

                                                            ? row?.plannedLabel

                                                            : row?.actualLabel;

                                                    return [`${label}h`, name];

                                                }}

                                            />

                                            <Legend />

                                            <Bar

                                                dataKey="planned"

                                                name="Planned"

                                                fill="#8b5cf6"

                                                radius={[0, 2, 2, 0]}

                                                barSize={10}

                                            />

                                            <Bar

                                                dataKey="actual"

                                                name="Actual"

                                                fill="#0ea5e9"

                                                radius={[0, 2, 2, 0]}

                                                barSize={10}

                                            />

                                        </BarChart>

                                    </ResponsiveContainer>

                                </div>

                                {!hasActualData && (

                                    <p className="text-xs text-gray-400 text-center">

                                        No approved actuals yet — sync time entries to populate actual bars.

                                    </p>

                                )}



                                <div className="border border-gray-100 rounded-lg overflow-hidden">

                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">

                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">

                                            All projects — hour breakdown

                                        </p>

                                    </div>

                                    <div className="max-h-52 overflow-y-auto">

                                        <table className="w-full text-sm">

                                            <thead className="sticky top-0 bg-white border-b border-gray-100">

                                                <tr className="text-left text-xs text-gray-500">

                                                    <th className="px-3 py-2 font-medium">Project</th>

                                                    <th className="px-3 py-2 font-medium text-right">Planned</th>

                                                    <th className="px-3 py-2 font-medium text-right">Actual</th>

                                                    <th className="px-3 py-2 font-medium text-right">Delivered</th>

                                                </tr>

                                            </thead>

                                            <tbody>

                                                {tableRows.map((row) => (

                                                    <tr

                                                        key={row.projectId}

                                                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"

                                                    >

                                                        <td className="px-3 py-2 text-gray-900 truncate max-w-[180px]">

                                                            {row.projectName}

                                                        </td>

                                                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">

                                                            {row.planned}h

                                                        </td>

                                                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">

                                                            {row.actual}h

                                                        </td>

                                                        <td className="px-3 py-2 text-right tabular-nums">

                                                            <span

                                                                className={

                                                                    row.deliveryPct >= 80

                                                                        ? 'text-emerald-600'

                                                                        : row.deliveryPct > 0

                                                                          ? 'text-amber-600'

                                                                          : 'text-gray-400'

                                                                }

                                                            >

                                                                {row.deliveryPct}%

                                                            </span>

                                                        </td>

                                                    </tr>

                                                ))}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            </>

                        ) : (

                            <p className="text-sm text-gray-500 py-8 text-center">

                                No utilization data for the selected range. Enable weekly allocations and sync

                                actuals.

                            </p>

                        )}



                        {summary && summary.overrunProjects.length > 0 && (

                            <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">

                                <div className="flex items-center gap-2 text-red-800 text-sm font-medium">

                                    <AlertTriangle className="w-4 h-4 shrink-0" />

                                    Project overrun alerts

                                </div>

                                <ul className="space-y-1">

                                    {summary.overrunProjects.slice(0, 5).map((p) => (

                                        <li

                                            key={p.projectId}

                                            className="flex items-center justify-between text-sm text-red-900"

                                        >

                                            <span className="truncate">{p.projectName}</span>

                                            <Badge variant="warning" className="shrink-0 ml-2">

                                                +{Math.round(p.overrunHours * 10) / 10}h

                                            </Badge>

                                        </li>

                                    ))}

                                </ul>

                            </div>

                        )}

                    </>

                )}

            </CardContent>

        </Card>

    );

}



function Kpi({

    label,

    value,

    hint,

    warn,

}: {

    label: string;

    value: string;

    hint?: string;

    warn?: boolean;

}) {

    return (

        <div

            className={`rounded-lg p-3 border ${warn ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}

        >

            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>

            <p className={`text-xl font-semibold ${warn ? 'text-amber-800' : 'text-gray-900'}`}>{value}</p>

            {hint && <p className="text-xs text-gray-400">{hint}</p>}

        </div>

    );

}


