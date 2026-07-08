import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PlannerGridSearchBarProps {
    projectSearch: string;
    resourceSearch: string;
    roleSearch?: string;
    onProjectSearchChange: (value: string) => void;
    onResourceSearchChange: (value: string) => void;
    onRoleSearchChange?: (value: string) => void;
    showRole?: boolean;
}

export function PlannerGridSearchBar({
    projectSearch,
    resourceSearch,
    roleSearch = '',
    onProjectSearchChange,
    onResourceSearchChange,
    onRoleSearchChange,
    showRole = false,
}: PlannerGridSearchBarProps) {
    return (
        <div
            className={`grid gap-2 ${showRole ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
        >
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search project…"
                    value={projectSearch}
                    onChange={(e) => onProjectSearchChange(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search resource…"
                    value={resourceSearch}
                    onChange={(e) => onResourceSearchChange(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>
            {showRole && onRoleSearchChange && (
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search resource role…"
                        value={roleSearch}
                        onChange={(e) => onRoleSearchChange(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            )}
        </div>
    );
}
