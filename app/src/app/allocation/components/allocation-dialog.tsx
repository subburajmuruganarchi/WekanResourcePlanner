import { useState } from "react"
import { Percent, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api-client"

interface AllocationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeId: string
    employeeName: string
    projectId: string
    projectName: string
    onSuccess?: () => void
}

interface AllocationRequest {
    projectId: string
    employeeId: string
    roleId: string
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
    onSuccess
}: AllocationDialogProps) {
    const [percentage, setPercentage] = useState("50")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Placeholder role ID - in real implementation, this would come from the form or context
    const roleId = "000000000000000000000001"

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        try {
            const request: AllocationRequest = {
                projectId,
                employeeId,
                roleId,
                startDate,
                endDate,
                percentage: parseInt(percentage, 10),
            }

            await api.post('/allocations', request)

            // Success - close dialog and notify parent
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            // Display backend validation errors verbatim
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
                    <DialogTitle>Allocate Resource</DialogTitle>
                    <DialogDescription>
                        Allocate <strong>{employeeName}</strong> to <strong>{projectName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="grid gap-4 py-4">
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
                        Confirm Allocation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
