import { Bell, Search, CheckCircle2, AlertCircle, Info, Check } from "lucide-react"
import { useNotifications } from "@/lib/use-notifications"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

export function Header() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

    const getIcon = (type: string, read: boolean) => {
        const props = { className: `w-5 h-5 ${read ? 'text-gray-400' : ''}` }
        switch (type) {
            case 'SUCCESS': return <CheckCircle2 {...props} className={read ? props.className : "w-5 h-5 text-green-500"} />
            case 'ERROR': return <AlertCircle {...props} className={read ? props.className : "w-5 h-5 text-red-500"} />
            case 'WARNING': return <AlertCircle {...props} className={read ? props.className : "w-5 h-5 text-amber-500"} />
            default: return <Info {...props} className={read ? props.className : "w-5 h-5 text-blue-500"} />
        }
    }

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
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors focus:outline-none">
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 mr-4" align="end">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-brand-600 hover:text-brand-700 hover:bg-transparent" onClick={() => markAllAsRead()}>
                                    <Check className="w-3 h-3 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notif: any) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 flex gap-3 transition-colors ${notif.read ? 'bg-white' : 'bg-blue-50/30'}`}
                                            onClick={() => !notif.read && markAsRead(notif.id)}
                                            role={notif.read ? "listitem" : "button"}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {getIcon(notif.type, notif.read)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm tracking-tight ${notif.read ? 'text-gray-600 font-medium' : 'text-gray-900 font-semibold'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className={`text-xs mt-1 leading-snug break-words ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <div className="shrink-0 flex items-center">
                                                    <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    )
}
