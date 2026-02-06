import { Outlet } from "react-router"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function AppShell() {
    return (
        <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
