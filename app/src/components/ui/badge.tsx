import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-background",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-brand-500 text-white shadow hover:bg-brand-600",
                secondary:
                    "border-transparent bg-brand-500/15 text-brand-700 dark:text-brand-300",
                success:
                    "border-success-border bg-success-bg text-success",
                warning:
                    "border-warning-border bg-warning-bg text-warning",
                info:
                    "border-info-border bg-info-bg text-info",
                outline: "text-foreground border-border",
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
