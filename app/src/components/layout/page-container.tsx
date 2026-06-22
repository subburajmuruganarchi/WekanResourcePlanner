import { cn } from "@/lib/utils"

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> { }

export function PageContainer({ className, children, ...props }: PageContainerProps) {
    return (
        <div className={cn("w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-in fade-in duration-500", className)} {...props}>
            {children}
        </div>
    )
}
