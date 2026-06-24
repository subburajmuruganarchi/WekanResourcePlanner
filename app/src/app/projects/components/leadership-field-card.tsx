import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface LeadershipFieldCardProps {
    icon: LucideIcon;
    title: string;
    hint?: string;
    children: ReactNode;
    action?: ReactNode;
    error?: string | null;
}

export function LeadershipFieldCard({
    icon: Icon,
    title,
    hint,
    children,
    action,
    error,
}: LeadershipFieldCardProps) {
    return (
        <div className="flex h-full min-h-[168px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{title}</p>
                    {hint ? <p className="text-xs text-slate-500 mt-0.5 leading-snug">{hint}</p> : null}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-2">
                <div className="flex-1">{children}</div>
                {error ? <p className="text-xs text-red-600 leading-snug">{error}</p> : null}
                {action ? <div className="pt-1">{action}</div> : null}
            </div>
        </div>
    );
}
