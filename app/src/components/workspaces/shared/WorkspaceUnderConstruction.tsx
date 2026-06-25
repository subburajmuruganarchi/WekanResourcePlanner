import { Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceUnderConstructionProps {
    title?: string;
    message: string;
    className?: string;
    children?: React.ReactNode;
}

/** MVP placeholder — blocks interaction and shows a clear not-ready state. */
export function WorkspaceUnderConstruction({
    title = 'Under construction',
    message,
    className,
    children,
}: WorkspaceUnderConstructionProps) {
    return (
        <div className={cn('relative min-h-[320px] rounded-xl', className)}>
            {children ? (
                <div className="pointer-events-none select-none opacity-30 blur-[2px]" aria-hidden="true">
                    {children}
                </div>
            ) : null}

            <div
                className="absolute inset-0 flex flex-col items-center justify-center px-6 py-12 z-10"
                role="status"
                aria-live="polite"
            >
                <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.06]"
                    aria-hidden="true"
                >
                    <span className="text-5xl sm:text-6xl font-black uppercase tracking-[0.2em] rotate-[-18deg] text-slate-900 whitespace-nowrap">
                        Under construction
                    </span>
                </div>

                <div className="relative max-w-lg w-full dashboard-card border-amber-200 bg-amber-50/90 backdrop-blur-sm p-6 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 mb-4">
                        <Construction className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mt-4">
                        Not included in MVP
                    </p>
                </div>
            </div>
        </div>
    );
}
