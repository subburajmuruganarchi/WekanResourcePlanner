import { useState, useEffect, useMemo } from "react"
import { Percent, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api-client"
import type { Employee, SkillRequirement, RoleEffort } from "@/types/api"

interface AllocationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeId: string
    employeeName: string
    projectId: string
    projectName: string
    skillRequirements?: SkillRequirement[]
    roleEfforts?: RoleEffort[]
    suggestedAllocationRoleId?: string
    suggestedAllocationRoleName?: string
    allocationId?: string
    initialPercentage?: number
    initialStartDate?: string
    initialEndDate?: string
    initialSkillId?: string
    initialRoleId?: string
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
}

export function AllocationDialog({
    open,
    onOpenChange,
    employeeId,
    employeeName,
    projectId,
    projectName,
    skillRequirements = [],
    roleEfforts = [],
    suggestedAllocationRoleId,
    suggestedAllocationRoleName,
    allocationId,
    initialPercentage,
    initialStartDate,
    initialEndDate,
    initialSkillId,
    initialRoleId,
    onSuccess
}: AllocationDialogProps) {
    const isEditMode = !!allocationId

    const [percentage, setPercentage] = useState(initialPercentage?.toString() || "50")
    const [startDate, setStartDate] = useState(initialStartDate || "")
    const [endDate, setEndDate] = useState(initialEndDate || "")
    const [selectedSkillId, setSelectedSkillId] = useState(initialSkillId || "")
    const [selectedRoleId, setSelectedRoleId] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [roleLoading, setRoleLoading] = useState(false)

    const roleOptions = useMemo(() => {
        const map = new Map<string, string>()
        for (const effort of roleEfforts) {
            if (effort.roleId) {
                const label = effort.roleName
                    ? `${effort.roleName} (${effort.remainingHeadcount ?? effort.originalHeadcount} open)`
                    : effort.roleId
                map.set(effort.roleId, label)
            }
        }
        for (const req of skillRequirements) {
            if (req.roleId && req.roleName) {
                map.set(req.roleId, `${req.roleName} (skill req)`)
            }
        }
        if (suggestedAllocationRoleId && suggestedAllocationRoleName && !map.has(suggestedAllocationRoleId)) {
            map.set(suggestedAllocationRoleId, suggestedAllocationRoleName)
        }
        return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
    }, [roleEfforts, skillRequirements, suggestedAllocationRoleId, suggestedAllocationRoleName])

    useEffect(() => {
        if (open) {
            setPercentage(initialPercentage?.toString() || "50")
            setStartDate(initialStartDate || "")
            setEndDate(initialEndDate || "")
            setSelectedSkillId(initialSkillId || "")
            setError(null)
        }
    }, [open, initialPercentage, initialStartDate, initialEndDate, initialSkillId])

    useEffect(() => {
        if (!open) {
            setSelectedRoleId("")
            setRoleLoading(false)
            return
        }

        if (isEditMode && initialRoleId) {
            setSelectedRoleId(initialRoleId)
            setRoleLoading(false)
            return
        }

        if (suggestedAllocationRoleId) {
            setSelectedRoleId(suggestedAllocationRoleId)
            setRoleLoading(false)
            return
        }

        if (roleOptions.length > 0) {
            setSelectedRoleId(roleOptions[0].id)
            setRoleLoading(false)
            return
        }

        let cancelled = false
        setRoleLoading(true)
        api.get<Employee>(`/employees/${employeeId}`)
            .then((emp) => {
                if (cancelled) return
                const jobId = emp.jobRoleId
                if (jobId) {
                    setSelectedRoleId(jobId)
                } else {
                    setSelectedRoleId("")
                }
            })
            .catch(() => {
                if (!cancelled) setSelectedRoleId("")
            })
            .finally(() => {
                if (!cancelled) setRoleLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [open, isEditMode, employeeId, suggestedAllocationRoleId, initialRoleId, roleOptions])

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        try {
            if (isEditMode) {
                await api.put(`/allocations/${allocationId}`, {
                    percentage: parseInt(percentage, 10),
                    startDate,
                    endDate,
                    skillId: selectedSkillId || undefined,
                })
            } else {
                if (!selectedRoleId) {
                    setError(
                        roleOptions.length === 0
                            ? 'Define role efforts on the project (or set a job role on the employee) before allocating.'
                            : 'Select the job role for this allocation.'
                    )
                    setLoading(false)
                    return
                }

                const request: AllocationRequest = {
                    projectId,
                    employeeId,
                    roleId: selectedRoleId,
                    skillId: selectedSkillId || undefined,
                    startDate,
                    endDate,
                    percentage: parseInt(percentage, 10),
                }

                await api.post('/allocations', request)
            }

            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setError(null)
        onOpenChange(false)
    }

    const needsRolePick = !isEditMode && roleOptions.length > 0

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
                    {!isEditMode && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-gray-700">Job role</label>
                            <div className="col-span-3">
                                {roleOptions.length > 0 ? (
                                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select project role..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleOptions.map((opt) => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
                                        No role efforts on this project. Add them under Projects → Role Efforts, or ensure the employee has a job role set.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

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
                        disabled={
                            loading ||
                            roleLoading ||
                            !startDate ||
                            !endDate ||
                            (!isEditMode && needsRolePick && !selectedRoleId)
                        }
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isEditMode ? 'Update Allocation' : 'Confirm Allocation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
