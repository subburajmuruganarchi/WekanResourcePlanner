import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AICopilotPanel } from '@/components/workspaces/ai/AICopilotPanel';

export function AppShell() {
    return (
        <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
            <AICopilotPanel />
        </div>
    );
}
