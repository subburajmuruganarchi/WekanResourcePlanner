import { useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChartDataRow {
    [key: string]: string | number;
}

interface AccessibleChartProps {
    title: string;
    description?: string;
    data: ChartDataRow[];
    columns: { key: string; header: string }[];
    children: React.ReactNode;
    className?: string;
}

export function AccessibleChart({
    title,
    description,
    data,
    columns,
    children,
    className,
}: AccessibleChartProps) {
    const [showTable, setShowTable] = useState(false);

    return (
        <div className={cn('dashboard-card p-4', className)}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => setShowTable((v) => !v)}
                    aria-pressed={showTable}
                >
                    {showTable ? (
                        <>
                            <BarChart3 className="w-3.5 h-3.5" />
                            Chart
                        </>
                    ) : (
                        <>
                            <Table2 className="w-3.5 h-3.5" />
                            Data
                        </>
                    )}
                </Button>
            </div>

            {showTable ? (
                <div className="overflow-x-auto max-h-56" role="region" aria-label={`${title} data table`}>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                                {columns.map((col) => (
                                    <th key={col.key} scope="col" className="px-2 py-2 font-semibold">
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-2 py-2 tabular-nums text-card-foreground">
                                            {row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div role="img" aria-label={`${title} chart`}>
                    {children}
                </div>
            )}
        </div>
    );
}
