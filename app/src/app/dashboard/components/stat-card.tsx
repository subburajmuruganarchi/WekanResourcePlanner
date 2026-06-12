import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    label: string
    value: string
    change?: string
    icon: LucideIcon
    color: "blue" | "green" | "purple" | "orange" | "amber" | "brand"
    highlight?: boolean
}

export function StatCard({ label, value, change, icon: Icon, color, highlight }: StatCardProps) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        brand: "bg-brand-50 text-brand-600 border-brand-100",
    }

    return (
        <div
            className={cn(
                "bg-white border rounded-xl p-5 transition-shadow hover:shadow-md",
                highlight ? "border-brand-200 ring-1 ring-brand-100" : "border-gray-200"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
                    {change && <p className="text-xs text-gray-500 mt-1.5 leading-snug">{change}</p>}
                </div>
                <div
                    className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center border shrink-0",
                        colorStyles[color]
                    )}
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}
