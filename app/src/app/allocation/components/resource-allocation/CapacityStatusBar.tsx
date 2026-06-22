const STATUS_ITEMS = [
    { dot: 'bg-emerald-500', label: 'Available' },
    { dot: 'bg-indigo-500', label: 'Optimized' },
    { dot: 'bg-amber-500', label: 'High Utilization' },
    { dot: 'bg-red-500', label: 'Over Capacity' },
] as const;

export function CapacityStatusBar() {
    return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Capacity Status</span>
            {STATUS_ITEMS.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                    <span className={cnDot(item.dot)} aria-hidden />
                    {item.label}
                </span>
            ))}
            <span className="ml-auto hidden sm:inline text-slate-400">
                Unsaved edits highlighted in grid view
            </span>
        </div>
    );
}

function cnDot(color: string) {
    return `h-2 w-2 shrink-0 rounded-full ${color}`;
}
