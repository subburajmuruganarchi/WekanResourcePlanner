import { Info } from 'lucide-react';
import type { CSSProperties } from 'react';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';

interface LegendSwatchProps {
    label: string;
    description: string;
    style: CSSProperties;
    className?: string;
}

function LegendSwatch({ label, description, style, className }: LegendSwatchProps) {
    return (
        <div className="flex items-start gap-2 min-w-[200px]">
            <span
                className={`mt-0.5 h-5 w-8 shrink-0 rounded border border-gray-300 ${className ?? ''}`}
                style={style}
                aria-hidden
            />
            <div>
                <p className="text-xs font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-600">{description}</p>
            </div>
        </div>
    );
}

export function AllocationGridLegend() {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
            <div className="space-y-3 text-xs">
                <div>
                    <p className="font-semibold text-gray-900 mb-2">Plan column</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <LegendSwatch
                            label="Over capacity"
                            description={`Resource total exceeds ${DEFAULT_WEEKLY_CAPACITY_HOURS} hrs/week across all projects.`}
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                        />
                        <LegendSwatch
                            label="High utilization"
                            description="Resource is at 80% or more of weekly capacity."
                            style={{ backgroundColor: '#eff6ff' }}
                        />
                        <LegendSwatch
                            label="Bench / no hours"
                            description="Resource has no planned hours that week."
                            style={{ backgroundColor: '#f0fdf4' }}
                        />
                        <LegendSwatch
                            label="Unsaved change"
                            description="Edited plan cell — save to persist to Weekly Planner."
                            style={{
                                backgroundColor: '#fffbeb',
                                borderColor: '#f59e0b',
                                borderWidth: 1,
                            }}
                        />
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-gray-900 mb-2">Act and Δ columns</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <LegendSwatch
                            label="Actual (Act)"
                            description="Approved time entries — read-only."
                            style={{ backgroundColor: '#f8fafc', color: '#475569', fontStyle: 'italic' }}
                        />
                        <LegendSwatch
                            label="Δ over plan"
                            description="Actual hours exceed planned on this project."
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                        />
                        <LegendSwatch
                            label="Δ under plan"
                            description="Actual hours are below planned on this project."
                            style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
                        />
                    </div>
                </div>
                <p className="text-gray-500">
                    Each week is grouped under its start date (e.g. Jun 15) with Plan, Act, and Δ
                    sub-columns — same layout as Weekly Planner.
                </p>
            </div>
        </div>
    );
}
