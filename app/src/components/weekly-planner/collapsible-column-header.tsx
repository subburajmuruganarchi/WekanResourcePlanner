import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CustomHeaderProps } from 'ag-grid-react';

export interface CollapsibleColumnHeaderParams {
    label: string;
    expanded: boolean;
    onToggle: () => void;
}

export function CollapsibleColumnHeader(
    props: CustomHeaderProps & CollapsibleColumnHeaderParams
) {
    const { label, expanded, onToggle } = props;

    return (
        <div className="flex items-center w-full h-full min-w-0 gap-0.5 px-0.5">
            <button
                type="button"
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200/80 text-gray-600"
                onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                }}
                title={expanded ? `Collapse ${label} column` : `Expand ${label} column`}
                aria-label={expanded ? `Collapse ${label} column` : `Expand ${label} column`}
                aria-expanded={expanded}
            >
                {expanded ? (
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                )}
            </button>
            {expanded && (
                <span className="truncate text-xs font-semibold text-gray-700">{label}</span>
            )}
        </div>
    );
}
