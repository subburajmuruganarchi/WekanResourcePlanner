import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';

const LEGEND_ITEMS = [
    {
        swatchClass: 'wp-legend-swatch--over',
        label: 'Over capacity',
        detail: `Total planned hours exceed ${DEFAULT_WEEKLY_CAPACITY_HOURS}h for that resource in the week.`,
    },
    {
        swatchClass: 'wp-legend-swatch--high-util',
        label: 'High utilization',
        detail: 'Resource is at 80% or more of weekly capacity.',
    },
    {
        swatchClass: 'wp-legend-swatch--bench',
        label: 'No allocation',
        detail: 'Resource has no planned hours in that week.',
    },
    {
        swatchClass: 'wp-legend-swatch--dirty',
        label: 'Unsaved change',
        detail: 'Cell was edited — use Save changes to persist.',
    },
] as const;

export function AllocationGridLegend() {
    return (
        <Card className="border-gray-200 bg-white shadow-none" aria-labelledby="allocation-colour-guide">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" aria-hidden />
                    <div className="min-w-0 flex-1 space-y-4">
                        <div>
                            <h2
                                id="allocation-colour-guide"
                                className="text-sm font-semibold text-gray-900"
                            >
                                Colour guide
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Highlights apply to weekly planned-hour cells in the table above.
                            </p>
                        </div>

                        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 list-none p-0 m-0">
                            {LEGEND_ITEMS.map((item) => (
                                <li
                                    key={item.label}
                                    className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
                                >
                                    <span
                                        className={`wp-legend-swatch ${item.swatchClass} mt-0.5`}
                                        aria-hidden
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-900">{item.label}</p>
                                        <p className="text-[11px] leading-snug text-gray-500 mt-0.5">
                                            {item.detail}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                            Standard weekly capacity is {DEFAULT_WEEKLY_CAPACITY_HOURS} hours per
                            resource. Week columns show planned hours only — hover a cell for approved
                            actuals and variance.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
