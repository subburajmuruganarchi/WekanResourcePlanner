import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    description?: string
    action?: React.ReactNode
}

export function Section({ className, title, description, action, children, ...props }: SectionProps) {
    return (
        <section className={cn("space-y-4", className)} {...props}>
            {(title || action) && (
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
                        {description && <p className="text-sm text-gray-500">{description}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </section>
    )
}
