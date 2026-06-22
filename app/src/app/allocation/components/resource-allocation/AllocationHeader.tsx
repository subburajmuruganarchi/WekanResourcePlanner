import {
    Plus,
    Upload,
    Download,
    Sparkles,
    Save,
    Undo2,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AllocationHeaderProps {
    canEdit: boolean;
    dirtyCount: number;
    saving: boolean;
    onAddAllocation: () => void;
    onImport: () => void;
    onExport: () => void;
    onAiOptimize: () => void;
    onSave: () => void;
    onDiscard: () => void;
    addDisabled?: boolean;
    weekNav?: {
        label: string;
        canBack: boolean;
        canForward: boolean;
        onBack: () => void;
        onForward: () => void;
    };
}

export function AllocationHeader({
    canEdit,
    dirtyCount,
    saving,
    onAddAllocation,
    onImport,
    onExport,
    onAiOptimize,
    onSave,
    onDiscard,
    addDisabled,
    weekNav,
}: AllocationHeaderProps) {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Resource Allocation Workspace
                </h1>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                    Plan workforce capacity, optimize utilization, and prevent delivery risks across
                    your portfolio.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                        <Button
                            type="button"
                            size="sm"
                            className="h-9 gap-1.5 enterprise-gradient-bg text-white hover:opacity-95 border-0"
                            onClick={onAddAllocation}
                            disabled={addDisabled}
                        >
                            <Plus className="w-4 h-4" />
                            Add Allocation
                        </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={onImport}>
                        <Upload className="w-4 h-4" />
                        Import
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={onAiOptimize}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Optimize
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {weekNav && (
                        <div className="flex items-center gap-1 mr-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!weekNav.canBack}
                                onClick={weekNav.onBack}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-slate-500 min-w-[120px] text-center">
                                {weekNav.label}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!weekNav.canForward}
                                onClick={weekNav.onForward}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {canEdit && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={onDiscard}
                                disabled={dirtyCount === 0 || saving}
                            >
                                <Undo2 className="w-4 h-4 mr-1.5" />
                                Undo
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-9 enterprise-gradient-bg text-white hover:opacity-95 border-0"
                                onClick={onSave}
                                disabled={dirtyCount === 0 || saving}
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-1.5" />
                                )}
                                Save{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
