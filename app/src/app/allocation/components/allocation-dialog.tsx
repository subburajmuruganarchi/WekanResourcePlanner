import { useState, useEffect } from "react"
import { Percent, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api-client"
import type { SkillRequirement } from "@/types/api"

interface AllocationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeId: string
    employeeName: string
    projectId: string
    projectName: string
    skillRequirements?: SkillRequirement[] // project skill requirements for dropdown
    // Edit mode props
    allocationId?: string
    initialPercentage?: number
    initialStartDate?: string
    initialEndDate?: string
    initialSkillId?: string
    onSuccess?: () => void
}

interface AllocationRequest {
    projectId: string
    employeeId: string
    roleId: string
    skillId?: string
    startDate: string
    endDate: string
    percentage: number
    isAdminOverride?: boolean
    overrideReason?: string
    authorizedById?: string
}

export function AllocationDialog({
    open,
    onOpenChange,
    employeeId,
    employeeName,
    projectId,
    projectName,
    skillRequirements = [],
    allocationId,
    initialPercentage,
    initialStartDate,
    initialEndDate,
    initialSkillId,
    onSuccess
}: AllocationDialogProps) {
    const isEditMode = !!allocationId

    const [percentage, setPercentage] = useState(initialPercentage?.toString() || "50")
    const [startDate, setStartDate] = useState(initialStartDate || "")
    const [endDate, setEndDate] = useState(initialEndDate || "")
    const [selectedSkillId, setSelectedSkillId] = useState(initialSkillId || "")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Placeholder role ID
    const roleId = "000000000000000000000001"

    // Reset form when dialog opens/closes or initial values change
    useEffect(() => {
        if (open) {
            setPercentage(initialPercentage?.toString() || "50")
            setStartDate(initialStartDate || "")
            setEndDate(initialEndDate || "")
            setSelectedSkillId(initialSkillId || "")
            setError(null)
        }
    }, [open, initialPercentage, initialStartDate, initialEndDate, initialSkillId])

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        try {
            if (isEditMode) {
                // Update existing allocation
                await api.put(`/allocations/${allocationId}`, {
                    percentage: parseInt(percentage, 10),
                    startDate,
                    endDate,
                    skillId: selectedSkillId || undefined,
                })
            } else {
                // Create new allocation
                const request: AllocationRequest = {
                    projectId,
                    employeeId,
                    roleId,
                    skillId: selectedSkillId || undefined,
                    startDate,
                    endDate,
                    percentage: parseInt(percentage, 10),
                }

                await api.post('/allocations', request)
            }

            // Success - close dialog and notify parent
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('An unexpected error occurred')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Allocation' : 'Allocate Resource'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? (
                            <>Update allocation for <strong>{employeeName}</strong> on <strong>{projectName}</strong>.</>
                        ) : (
                            <>Allocate <strong>{employeeName}</strong> to <strong>{projectName}</strong>.</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="grid gap-4 py-4">
                    {/* Skill Selection */}
                    {skillRequirements.length > 0 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-gray-700">Skill</label>
                            <div className="col-span-3">
                                <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select skill requirement..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {skillRequirements.map((req) => (
                                            <SelectItem key={req.skillId} value={req.skillId}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{req.skillName || 'Skill'}</span>
                                                    <span className="text-xs text-gray-400">
                                                        ({req.minSkillLevel}+, {req.originalHeadcount} needed)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium text-gray-700">Percentage</label>
                        <div className="col-span-3 relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                className="pl-9"
                                type="number"
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium text-gray-700">Start Date</label>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                className="w-full"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium text-gray-700">End Date</label>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                className="w-full"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !startDate || !endDate}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isEditMode ? 'Update Allocation' : 'Confirm Allocation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
