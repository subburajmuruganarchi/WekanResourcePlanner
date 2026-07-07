import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

type ToastContextValue = {
    toasts: ToastMessage[];
    toast: (msg: Omit<ToastMessage, 'id'>) => void;
    dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
    default: 'border-border bg-card',
    success: 'border-success-border bg-success-bg',
    error: 'border-critical-border bg-critical-bg',
    info: 'border-info-border bg-info-bg',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
    default: <Info className="w-4 h-4 text-muted-foreground" />,
    success: <CheckCircle2 className="w-4 h-4 text-success" />,
    error: <AlertCircle className="w-4 h-4 text-critical" />,
    info: <Info className="w-4 h-4 text-info" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

    const dismiss = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = React.useCallback(
        (msg: Omit<ToastMessage, 'id'>) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const entry: ToastMessage = { ...msg, id };
            setToasts((prev) => [...prev, entry]);
            const duration = msg.duration ?? 4000;
            window.setTimeout(() => dismiss(id), duration);
        },
        [dismiss]
    );

    const value = React.useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.length > 0 && (
                <div
                    role="region"
                    aria-label="Notifications"
                    className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
                >
                    {toasts.map((t) => (
                        <div
                            key={t.id}
                            role="status"
                            aria-live="polite"
                            className={cn(
                                'pointer-events-auto flex gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-top-2 duration-200',
                                variantStyles[t.variant ?? 'default']
                            )}
                        >
                            <div className="shrink-0 mt-0.5">{variantIcons[t.variant ?? 'default']}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-card-foreground">{t.title}</p>
                                {t.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 p-1 rounded hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="Dismiss"
                            >
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
