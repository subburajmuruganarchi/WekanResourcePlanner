import { useState } from "react"
import { Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AllocationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeName: string
    projectName: string
}

export function AllocationDialog({ open, onOpenChange, employeeName, projectName }: AllocationDialogProps) {
    const [percentage, setPercentage] = useState("50")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Allocate Resource</DialogTitle>
                    <DialogDescription>
                        Allocate <strong>{employeeName}</strong> to <strong>{projectName}</strong>.
                    </DialogDescription>
                </DialogHeader>
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
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium text-gray-700">Duration</label>
                        <div className="col-span-3 flex gap-2">
                            <div className="relative flex-1">
                                <Input type="date" className="w-full" />
                            </div>
                            <span className="self-center text-gray-500">-</span>
                            <div className="relative flex-1">
                                <Input type="date" className="w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium text-gray-700">Role</label>
                        <Select defaultValue="developer">
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="developer">Developer</SelectItem>
                                <SelectItem value="senior-developer">Senior Developer</SelectItem>
                                <SelectItem value="lead">Tech Lead</SelectItem>
                                <SelectItem value="architect">Architect</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" onClick={() => onOpenChange(false)}>Confirm Allocation</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
