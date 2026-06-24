import { Loader2, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    TimeEntryDatePicker,
    type DatePickMode,
    type DateRangeValue,
} from "./time-entry-date-picker"
import type { DayEntry, ProjectOption } from "./time-entry-types"

interface CodeOption {
    code: string
    name: string
}

interface TimeEntryEntryDialogProps {
    open: boolean
    entry: DayEntry | null
    projects: ProjectOption[]
    leaveTypes: CodeOption[]
    otherCodes: CodeOption[]
    isLocked: boolean
    projectReadOnly?: boolean
    isSaving: boolean
    canSave: boolean
    dateMode: DatePickMode
    selectedDate: string
    dateRange: DateRangeValue | null
    onDateModeChange: (mode: DatePickMode) => void
    onSelectedDateChange: (date: string) => void
    onDateRangeChange: (range: DateRangeValue | null) => void
    onClose: () => void
    onChange: (field: keyof DayEntry, value: string | number) => void
    onSave: () => void
    onDelete?: () => void
}

export function TimeEntryEntryDialog({
    open,
    entry,
    projects,
    leaveTypes,
    otherCodes,
    isLocked,
    projectReadOnly = false,
    isSaving,
    canSave,
    dateMode,
    selectedDate,
    dateRange,
    onDateModeChange,
    onSelectedDateChange,
    onDateRangeChange,
    onClose,
    onChange,
    onSave,
    onDelete,
}: TimeEntryEntryDialogProps) {
    const isNew = !entry?.serverEntryId

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isNew ? "Log time" : "Edit time entry"}</DialogTitle>
                    <DialogDescription>
                        {isNew
                            ? "Choose a single day or a date range, then log hours for your project."
                            : "Update this time entry."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Date</label>
                        <TimeEntryDatePicker
                            mode={dateMode}
                            onModeChange={onDateModeChange}
                            singleDate={selectedDate}
                            range={dateRange}
                            onSingleDateChange={onSelectedDateChange}
                            onRangeChange={onDateRangeChange}
                            disabled={isLocked}
                            allowRange={isNew}
                        />
                        {dateMode === "range" && dateRange && isNew && (
                            <p className="text-xs text-slate-500">
                                The same project and hours will be applied to each weekday in the
                                selected range.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Project</label>
                        <Select
                            value={entry?.projectCode || ""}
                            disabled={isLocked || projectReadOnly}
                            onValueChange={(val) => onChange("projectCode", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Your allocations</SelectLabel>
                                    {projects.filter((p) => p.isAllocated).length === 0 ? (
                                        <SelectItem value="__none_alloc__" disabled>
                                            No allocations this week
                                        </SelectItem>
                                    ) : (
                                        projects
                                            .filter((p) => p.isAllocated)
                                            .map((p) => (
                                                <SelectItem key={p.code} value={p.code}>
                                                    {p.name}
                                                </SelectItem>
                                            ))
                                    )}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>All active projects</SelectLabel>
                                    {projects
                                        .filter((p) => !p.isAllocated)
                                        .map((p) => (
                                            <SelectItem key={p.code} value={p.code}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Leave</SelectLabel>
                                    {leaveTypes.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>
                                            {l.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Other</SelectLabel>
                                    {otherCodes.map((o) => (
                                        <SelectItem key={o.code} value={o.code}>
                                            {o.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Hours</label>
                        <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            placeholder="e.g. 8"
                            disabled={isLocked}
                            value={entry?.hours || ""}
                            onChange={(e) =>
                                onChange("hours", parseFloat(e.target.value) || 0)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Comments</label>
                        <Input
                            placeholder="Optional notes"
                            disabled={isLocked}
                            value={entry?.comments || ""}
                            onChange={(e) => onChange("comments", e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {!isLocked && onDelete && entry?.serverEntryId && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
                            disabled={isSaving}
                            onClick={onDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    {!isLocked && (
                        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {dateMode === "range" && isNew ? "Save to range" : "Save"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
