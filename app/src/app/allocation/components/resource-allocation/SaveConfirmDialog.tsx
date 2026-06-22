import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SaveConfirmDialogProps {
    open: boolean;
    dirtyCount: number;
    saving: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function SaveConfirmDialog({
    open,
    dirtyCount,
    saving,
    onConfirm,
    onCancel,
}: SaveConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Save allocation changes?</DialogTitle>
                    <DialogDescription>
                        You have {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}. This will
                        persist planned hours and sync to Weekly Planner.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="enterprise-gradient-bg text-white border-0"
                        onClick={onConfirm}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            'Confirm save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
