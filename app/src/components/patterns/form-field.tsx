import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function FormField({ label, htmlFor, hint, error, required, children, className }: FormFieldProps) {
    const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
    const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;

    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={htmlFor} className="text-sm font-medium text-card-foreground">
                {label}
                {required && <span className="text-critical ml-0.5" aria-hidden>*</span>}
            </Label>
            {children}
            {hint && !error && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="text-xs text-critical">
                    {error}
                </p>
            )}
        </div>
    );
}

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

interface AutosaveIndicatorProps {
    state: AutosaveState;
    unsavedCount?: number;
    className?: string;
}

const stateLabels: Record<AutosaveState, string> = {
    idle: '',
    saving: 'Saving…',
    saved: 'All changes saved',
    unsaved: 'Unsaved changes',
    error: 'Save failed — retry',
};

export function AutosaveIndicator({ state, unsavedCount = 0, className }: AutosaveIndicatorProps) {
    if (state === 'idle') return null;

    const label =
        state === 'unsaved' && unsavedCount > 0
            ? `${unsavedCount} unsaved change${unsavedCount !== 1 ? 's' : ''}`
            : stateLabels[state];

    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full',
                state === 'saving' && 'bg-muted text-muted-foreground',
                state === 'saved' && 'bg-success-bg text-success border border-success-border',
                state === 'unsaved' && 'bg-warning-bg text-warning border border-warning-border',
                state === 'error' && 'bg-critical-bg text-critical border border-critical-border',
                className
            )}
            role="status"
            aria-live="polite"
        >
            {state === 'saving' && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" aria-hidden />
            )}
            {state === 'saved' && <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />}
            {state === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />}
            {label}
        </div>
    );
}

export function deriveAutosaveState(opts: {
    saving?: boolean;
    dirtyCount?: number;
    justSaved?: boolean;
    error?: boolean;
}): AutosaveState {
    if (opts.error) return 'error';
    if (opts.saving) return 'saving';
    if (opts.justSaved && (opts.dirtyCount ?? 0) === 0) return 'saved';
    if ((opts.dirtyCount ?? 0) > 0) return 'unsaved';
    return 'idle';
}
