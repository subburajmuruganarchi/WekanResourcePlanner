import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { useEmployees } from "@/lib/use-employees"
import { createOkr, updateOkr, type OkrEntry } from "@/lib/use-okrs"

interface OkrFormDialogProps {
    okr?: OkrEntry | null
    defaultPeriod: string
    defaultEmployeeId?: string
    onClose: () => void
}

interface KeyResultForm {
    title: string
    target: string
    unit: string
}

export function OkrFormDialog({ okr, defaultPeriod, defaultEmployeeId, onClose }: OkrFormDialogProps) {
    const isEdit = !!okr
    const { employees } = useEmployees()

    // Parse default period
    const [defaultQ, defaultY] = defaultPeriod.split("-")

    const [employeeId, setEmployeeId] = useState(okr?.employeeId || defaultEmployeeId || "")
    const [objective, setObjective] = useState(okr?.objective || "")
    const [periodQuarter, setPeriodQuarter] = useState<string>(okr?.periodQuarter || defaultQ || "Q1")
    const [periodYear, setPeriodYear] = useState(okr?.periodYear?.toString() || defaultY || new Date().getFullYear().toString())
    const [status, setStatus] = useState(okr?.status || "Draft")
    const [keyResults, setKeyResults] = useState<KeyResultForm[]>(
        okr?.keyResults?.map(kr => ({
            title: kr.title,
            target: kr.target.toString(),
            unit: kr.unit,
        })) || [{ title: "", target: "", unit: "" }]
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const addKeyResult = () => {
        setKeyResults([...keyResults, { title: "", target: "", unit: "" }])
    }

    const removeKeyResult = (index: number) => {
        if (keyResults.length <= 1) return
        setKeyResults(keyResults.filter((_, i) => i !== index))
    }

    const updateKeyResult = (index: number, field: keyof KeyResultForm, value: string) => {
        setKeyResults(prev => prev.map((kr, i) =>
            i === index ? { ...kr, [field]: value } : kr
        ))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (!isEdit && !employeeId) {
            setError("Please select an employee"); return
        }
        if (!objective.trim()) {
            setError("Objective is required"); return
        }
        const validKRs = keyResults.filter(kr => kr.title.trim() && kr.target.trim() && kr.unit.trim())
        if (validKRs.length === 0) {
            setError("At least one complete key result is required"); return
        }

        setSaving(true)
        try {
            if (isEdit && okr) {
                await updateOkr(okr.id, {
                    objective: objective.trim(),
                    status,
                    keyResults: validKRs.map(kr => ({
                        title: kr.title.trim(),
                        target: Number(kr.target),
                        unit: kr.unit.trim(),
                    })),
                })
            } else {
                await createOkr({
                    employeeId,
                    objective: objective.trim(),
                    periodQuarter: periodQuarter as "Q1" | "Q2" | "Q3" | "Q4",
                    periodYear: Number(periodYear),
                    status,
                    keyResults: validKRs.map(kr => ({
                        title: kr.title.trim(),
                        target: Number(kr.target),
                        unit: kr.unit.trim(),
                    })),
                })
            }
            onClose()
        } catch (err: any) {
            setError(err.message || "Failed to save OKR")
        } finally {
            setSaving(false)
        }
    }

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? "Edit OKR" : "Create OKR"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Employee Selector */}
                    {!isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee</label>
                            <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                required
                            >
                                <option value="">Select employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Objective */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Objective</label>
                        <input
                            type="text"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            placeholder="e.g., Improve API performance and reliability"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            required
                        />
                    </div>

                    {/* Period & Status */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quarter</label>
                            <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                value={periodQuarter}
                                onChange={(e) => setPeriodQuarter(e.target.value)}
                                disabled={isEdit}
                            >
                                <option value="Q1">Q1 (Jan-Mar)</option>
                                <option value="Q2">Q2 (Apr-Jun)</option>
                                <option value="Q3">Q3 (Jul-Sep)</option>
                                <option value="Q4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                            <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                value={periodYear}
                                onChange={(e) => setPeriodYear(e.target.value)}
                                disabled={isEdit}
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                            <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Key Results */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">Key Results</label>
                            <button
                                type="button"
                                onClick={addKeyResult}
                                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Key Result
                            </button>
                        </div>

                        <div className="space-y-3">
                            {keyResults.map((kr, index) => (
                                <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                            placeholder="Key result title (e.g., Reduce API response time)"
                                            value={kr.title}
                                            onChange={(e) => updateKeyResult(index, "title", e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-32 border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                                placeholder="Target"
                                                value={kr.target}
                                                onChange={(e) => updateKeyResult(index, "target", e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="w-32 border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                                placeholder="Unit (e.g., ms, %, PRs)"
                                                value={kr.unit}
                                                onChange={(e) => updateKeyResult(index, "unit", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {keyResults.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeKeyResult(index)}
                                            className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {saving ? "Saving..." : isEdit ? "Update OKR" : "Create OKR"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
