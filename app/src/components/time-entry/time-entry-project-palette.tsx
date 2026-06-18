import { GripVertical, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { projectChipColor } from "./project-color"
import { TIME_ENTRY_DRAG_TYPE, type ProjectOption } from "./time-entry-types"

interface TimeEntryProjectPaletteProps {
    projects: ProjectOption[]
    disabled?: boolean
}

function DraggableProject({
    project,
    disabled,
}: {
    project: ProjectOption
    disabled?: boolean
}) {
    const handleDragStart = (e: React.DragEvent) => {
        if (disabled) {
            e.preventDefault()
            return
        }
        e.dataTransfer.setData(
            TIME_ENTRY_DRAG_TYPE,
            JSON.stringify({ code: project.code, id: project.id, name: project.name })
        )
        e.dataTransfer.effectAllowed = "copy"
    }

    return (
        <div
            draggable={!disabled}
            onDragStart={handleDragStart}
            className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-grab active:cursor-grabbing transition-shadow",
                projectChipColor(project.code),
                disabled && "opacity-50 cursor-not-allowed",
                !disabled && "hover:shadow-sm"
            )}
            title={disabled ? undefined : `Drag to a day to log time on ${project.name}`}
        >
            <GripVertical className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{project.name}</p>
                <p className="text-[10px] opacity-70 truncate">{project.code}</p>
            </div>
        </div>
    )
}

export function TimeEntryProjectPalette({ projects, disabled }: TimeEntryProjectPaletteProps) {
    const allocated = projects.filter((p) => p.isAllocated)
    const other = projects.filter((p) => !p.isAllocated)

    return (
        <div className="w-full lg:w-56 xl:w-64 shrink-0">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden sticky top-4">
                <div className="px-3 py-2.5 border-b bg-gray-50 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Projects</p>
                        <p className="text-[10px] text-gray-500">Drag onto a day</p>
                    </div>
                </div>

                <div className="p-2 space-y-3 max-h-[min(420px,50vh)] overflow-y-auto">
                    {projects.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6 px-2">
                            No active projects available
                        </p>
                    ) : (
                        <>
                            {allocated.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
                                        Your allocations
                                    </p>
                                    {allocated.map((p) => (
                                        <DraggableProject key={p.id} project={p} disabled={disabled} />
                                    ))}
                                </div>
                            )}
                            {other.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
                                        All active projects
                                    </p>
                                    {other.map((p) => (
                                        <DraggableProject key={p.id} project={p} disabled={disabled} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
