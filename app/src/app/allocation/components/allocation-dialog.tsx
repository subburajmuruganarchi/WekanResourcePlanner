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
    projectStartDate?: string
    projectEndDate?: string
    allocationId?: string
    initialPercentage?: number
    initialStartDate?: string
    initialEndDate?: string
    initialSkillId?: string
    initialSkillIds?: string[]
    initialRoleId?: string
    onSuccess?: () => void
}

interface AllocationRequest {
    projectId: string
    employeeId: string
    roleId: string
    skillId?: string
    skillIds?: string[]
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
    projectStartDate,
    projectEndDate,
    allocationId,
    initialPercentage,
    initialStartDate,
    initialEndDate,
    initialSkillId,
    initialSkillIds,
    initialRoleId,
    onSuccess
}: AllocationDialogProps) {
    const isEditMode = !!allocationId

    const [percentage, setPercentage] = useState(initialPercentage?.toString() || "50")
    const [startDate, setStartDate] = useState(initialStartDate || "")
    const [endDate, setEndDate] = useState(initialEndDate || "")
    const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
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
            setStartDate(initialStartDate || projectStartDate || "")
            setEndDate(initialEndDate || projectEndDate || "")
            const skills =
                initialSkillIds?.length
                    ? initialSkillIds
                    : initialSkillId
                      ? [initialSkillId]
                      : []
            setSelectedSkillIds(skills)
            setError(null)
        }
    }, [open, initialPercentage, initialStartDate, initialEndDate, initialSkillId, initialSkillIds, projectStartDate, projectEndDate])

    const toggleSkill = (skillId: string) => {
        setSelectedSkillIds((prev) =>
            prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
        )
    }

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
                    skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
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
                    skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
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
            <DialogContent className="sm:max-w-[480px]">
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
                        <div className="grid grid-cols-4 items-start gap-4">
                            <label className="text-right text-sm font-medium text-gray-700 pt-2">Skills</label>
                            <div className="col-span-3 space-y-2">
                                <p className="text-xs text-gray-500">Select one or more project skill requirements.</p>
                                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y">
                                    {skillRequirements.map((req) => {
                                        const checked = selectedSkillIds.includes(req.skillId)
                                        return (
                                            <label
                                                key={req.skillId}
                                                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                                                    checked ? 'bg-brand-50/60' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                    checked={checked}
                                                    onChange={() => toggleSkill(req.skillId)}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-medium text-gray-900">
                                                        {req.skillName || 'Skill'}
                                                    </span>
                                                    <span className="block text-xs text-gray-500 mt-0.5">
                                                        {req.minSkillLevel}+ · {req.originalHeadcount} needed
                                                        {req.roleName ? ` · ${req.roleName}` : ''}
                                                    </span>
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                                {selectedSkillIds.length > 0 && (
                                    <p className="text-xs text-gray-600">
                                        {selectedSkillIds.length} skill{selectedSkillIds.length === 1 ? '' : 's'} selected
                                    </p>
                                )}
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
