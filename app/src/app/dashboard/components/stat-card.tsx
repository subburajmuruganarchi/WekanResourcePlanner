import type { LucideIcon } from "lucide-react"

interface StatCardProps {
    label: string
    value: string
    change?: string
    icon: LucideIcon
    color: "blue" | "green" | "purple" | "orange"
}

export function StatCard({ label, value, change, icon: Icon, color }: StatCardProps) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className="text-3xl font-semibold text-gray-900 mt-2">{value}</p>
                    {change && <p className="text-xs text-gray-500 mt-2">{change}</p>}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorStyles[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    )
}
