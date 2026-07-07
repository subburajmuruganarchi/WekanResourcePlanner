import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmptyState } from './empty-state';
import { Inbox } from 'lucide-react';

export type DataTableColumn<T> = {
    id: string;
    header: string;
    accessor: (row: T) => React.ReactNode;
    sortValue?: (row: T) => string | number;
    exportValue?: (row: T) => string;
    className?: string;
    hideOnMobile?: boolean;
    defaultVisible?: boolean;
};

export type EnterpriseDataTableProps<T> = {
    columns: DataTableColumn<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    loading?: boolean;
    searchPlaceholder?: string;
    searchFilter?: (row: T, query: string) => boolean;
    onRowClick?: (row: T) => void;
    exportFilename?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    mobileCardRender?: (row: T) => React.ReactNode;
    maxHeight?: string;
    storageKey?: string;
};

type SortDir = 'asc' | 'desc';

function loadVisibleColumns(key: string, columns: DataTableColumn<unknown>[]): Set<string> {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const ids = JSON.parse(raw) as string[];
            return new Set(ids);
        }
    } catch {
        /* ignore */
    }
    return new Set(
        columns.filter((c) => c.defaultVisible !== false).map((c) => c.id)
    );
}

export function EnterpriseDataTable<T>({
    columns,
    rows,
    rowKey,
    loading,
    searchPlaceholder = 'Search…',
    searchFilter,
    onRowClick,
    exportFilename = 'export',
    emptyTitle = 'No data',
    emptyDescription = 'Nothing to display yet.',
    mobileCardRender,
    maxHeight = '28rem',
    storageKey,
}: EnterpriseDataTableProps<T>) {
    const [query, setQuery] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [visibleCols, setVisibleCols] = useState<Set<string>>(() =>
        storageKey ? loadVisibleColumns(storageKey, columns as DataTableColumn<unknown>[]) : new Set(columns.map((c) => c.id))
    );

    const visibleColumns = useMemo(
        () => columns.filter((c) => visibleCols.has(c.id)),
        [columns, visibleCols]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        if (searchFilter) return rows.filter((r) => searchFilter(r, q));
        return rows.filter((r) =>
            columns.some((c) => {
                const v = c.exportValue?.(r) ?? String(c.sortValue?.(r) ?? '');
                return v.toLowerCase().includes(q);
            })
        );
    }, [rows, query, searchFilter, columns]);

    const sorted = useMemo(() => {
        if (!sortCol) return filtered;
        const col = columns.find((c) => c.id === sortCol);
        if (!col?.sortValue) return filtered;
        return [...filtered].sort((a, b) => {
            const av = col.sortValue!(a);
            const bv = col.sortValue!(b);
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortCol, sortDir, columns]);

    const toggleSort = (colId: string) => {
        const col = columns.find((c) => c.id === colId);
        if (!col?.sortValue) return;
        if (sortCol === colId) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortCol(colId);
            setSortDir('asc');
        }
    };

    const toggleColumn = (id: string) => {
        setVisibleCols((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                if (next.size > 1) next.delete(id);
            } else {
                next.add(id);
            }
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify([...next]));
            }
            return next;
        });
    };

    const exportCsv = () => {
        const exportCols = columns.filter((c) => visibleCols.has(c.id) && c.exportValue);
        const header = exportCols.map((c) => c.header).join(',');
        const body = sorted
            .map((row) =>
                exportCols
                    .map((c) => {
                        const val = c.exportValue!(row).replace(/"/g, '""');
                        return `"${val}"`;
                    })
                    .join(',')
            )
            .join('\n');
        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFilename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="dashboard-card h-48 enterprise-skeleton" role="status" aria-label="Loading table" />;
    }

    if (rows.length === 0) {
        return (
            <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
        );
    }

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b border-border bg-muted/30">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9 h-9"
                        aria-label="Search table"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Columns
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-52 p-2">
                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Visible columns</p>
                            {columns.map((col) => (
                                <label
                                    key={col.id}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleCols.has(col.id)}
                                        onChange={() => toggleColumn(col.id)}
                                        className="rounded border-border"
                                    />
                                    {col.header}
                                </label>
                            ))}
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Mobile card view */}
            {mobileCardRender && (
                <div className="md:hidden divide-y divide-border max-h-[var(--table-max-h)] overflow-y-auto" style={{ '--table-max-h': maxHeight } as React.CSSProperties}>
                    {sorted.map((row) => (
                        <div
                            key={rowKey(row)}
                            className={cn('p-4', onRowClick && 'cursor-pointer hover:bg-muted/50')}
                            onClick={() => onRowClick?.(row)}
                            onKeyDown={(e) => {
                                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    onRowClick(row);
                                }
                            }}
                            role={onRowClick ? 'button' : undefined}
                            tabIndex={onRowClick ? 0 : undefined}
                        >
                            {mobileCardRender(row)}
                        </div>
                    ))}
                    {sorted.length === 0 && (
                        <p className="p-6 text-sm text-muted-foreground text-center">No matches</p>
                    )}
                </div>
            )}

            {/* Desktop table */}
            <div className={cn('overflow-x-auto', mobileCardRender && 'hidden md:block')} style={{ maxHeight }}>
                <table className="w-full text-sm" role="table">
                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                            {visibleColumns.map((col) => (
                                <th key={col.id} scope="col" className={cn('px-4 py-3 font-semibold', col.className)}>
                                    {col.sortValue ? (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                                            onClick={() => toggleSort(col.id)}
                                        >
                                            {col.header}
                                            {sortCol === col.id ? (
                                                sortDir === 'asc' ? (
                                                    <ArrowUp className="w-3 h-3" />
                                                ) : (
                                                    <ArrowDown className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                                            )}
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row) => (
                            <tr
                                key={rowKey(row)}
                                className={cn(
                                    'border-b border-border/50 transition-colors',
                                    onRowClick && 'cursor-pointer hover:bg-muted/50'
                                )}
                                onClick={() => onRowClick?.(row)}
                            >
                                {visibleColumns.map((col) => (
                                    <td key={col.id} className={cn('px-4 py-3', col.className)}>
                                        {col.accessor(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sorted.length === 0 && (
                    <p className="p-6 text-sm text-muted-foreground text-center">No matches for your search</p>
                )}
            </div>
        </div>
    );
}
