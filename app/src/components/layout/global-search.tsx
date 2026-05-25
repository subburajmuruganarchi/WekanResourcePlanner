import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

interface SearchResult {
    employees: { id: string; name: string; email: string; href: string }[];
    projects: { id: string; name: string; code: string; status: string; href: string }[];
}

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            setResults(null);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await api.get<SearchResult>(`/search?q=${encodeURIComponent(query.trim())}`);
                setResults(data);
                setOpen(true);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const go = (href: string) => {
        setOpen(false);
        setQuery('');
        navigate(href);
    };

    const hasResults =
        (results?.employees?.length ?? 0) > 0 || (results?.projects?.length ?? 0) > 0;

    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                placeholder="Search projects, employees..."
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 hover:bg-white transition-colors"
            />
            {open && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {!hasResults && !loading && (
                        <p className="p-3 text-sm text-gray-500">No results</p>
                    )}
                    {results?.projects && results.projects.length > 0 && (
                        <div className="p-2 border-b">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Projects</p>
                            {results.projects.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 text-sm"
                                    onMouseDown={() => go(p.href)}
                                >
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-gray-400 ml-2">{p.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {results?.employees && results.employees.length > 0 && (
                        <div className="p-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Employees</p>
                            {results.employees.map((e) => (
                                <button
                                    key={e.id}
                                    type="button"
                                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 text-sm"
                                    onMouseDown={() => go(e.href)}
                                >
                                    <span className="font-medium">{e.name}</span>
                                    <span className="text-gray-400 text-xs block">{e.email}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
