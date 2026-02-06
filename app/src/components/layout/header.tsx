import { Bell, Search } from "lucide-react"

export function Header() {
    return (
        <header className="h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10">
            {/* Left: Search / Breadcrumbs placeholder */}
            <div className="flex items-center gap-4 w-96">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects, employees..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 hover:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                {/* User Menu will be handled by Sidebar in this layout version, or here if preferred. 
            Raw Sidebar has User Profile at bottom, so we keep it there for consistency. */}
            </div>
        </header>
    )
}
