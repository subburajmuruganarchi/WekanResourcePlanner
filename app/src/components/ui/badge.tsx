import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-brand-500 text-white shadow hover:bg-brand-600",
                secondary:
                    "border-transparent bg-brand-50 text-brand-700 hover:bg-brand-100", // "Active" State look-alike (Red based per brand, but functional might differ)
                success:
                    "border-transparent bg-green-100 text-green-700 hover:bg-green-200",
                warning:
                    "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
                info:
                    "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
                outline: "text-gray-900 border-gray-200",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
