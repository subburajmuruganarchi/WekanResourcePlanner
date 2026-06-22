import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickTimeEntryProps {
    disabled?: boolean;
    onClick: () => void;
}

export function QuickTimeEntry({ disabled, onClick }: QuickTimeEntryProps) {
    return (
        <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={onClick}
            className="fixed bottom-6 right-6 z-30 h-12 rounded-full shadow-lg enterprise-gradient-bg text-white border-0 hover:opacity-95 gap-2 px-5"
        >
            <Plus className="w-5 h-5" />
            Add Time
        </Button>
    );
}
