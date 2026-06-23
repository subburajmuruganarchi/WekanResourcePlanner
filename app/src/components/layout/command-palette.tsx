import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
    id: string;
    label: string;
    group: string;
    path: string;
    keywords?: string;
}

interface CommandPaletteProps {
    items: CommandItem[];
}

export function CommandPalette({ items }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((v) => !v);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (i) =>
                i.label.toLowerCase().includes(q) ||
                i.group.toLowerCase().includes(q) ||
                (i.keywords?.toLowerCase().includes(q) ?? false)
        );
    }, [items, query]);

    const grouped = useMemo(() => {
        const m = new Map<string, CommandItem[]>();
        for (const item of filtered) {
            const list = m.get(item.group) ?? [];
            list.push(item);
            m.set(item.group, list);
        }
        return m;
    }, [filtered]);

    const run = (path: string) => {
        setOpen(false);
        setQuery('');
        navigate(path);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-900/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-lg dashboard-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 border-b border-slate-100">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages, actions…"
                        className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-slate-400"
                    />
                    <kbd className="hidden sm:inline text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        ESC
                    </kbd>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No matches</p>
                    ) : (
                        [...grouped.entries()].map(([group, groupItems]) => (
                            <div key={group} className="mb-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1.5">
                                    {group}
                                </p>
                                {groupItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={cn(
                                            'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left',
                                            'hover:bg-brand-50 text-slate-800 transition-colors'
                                        )}
                                        onClick={() => run(item.path)}
                                    >
                                        <span>{item.label}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
