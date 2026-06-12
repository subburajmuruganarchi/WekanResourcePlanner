import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface FilterOption {
    value: string
    label: string
}

interface FilterBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    statusFilter?: {
        value: string
        onChange: (value: string) => void
        options: FilterOption[]
    }
    priorityFilter?: {
        value: string
        onChange: (value: string) => void
        options: FilterOption[]
    }
}

export function FilterBar({
    value,
    onChange,
    placeholder = "Search",
    statusFilter,
    priorityFilter,
}: FilterBarProps) {
    return (
        <div className="flex items-center gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder={placeholder}
                    className="pl-9 bg-white"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>
            {statusFilter && (
                <Select value={statusFilter.value} onValueChange={statusFilter.onChange}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {statusFilter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {priorityFilter && (
                <Select value={priorityFilter.value} onValueChange={priorityFilter.onChange}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        {priorityFilter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    )
}
