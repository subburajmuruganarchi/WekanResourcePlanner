import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';

export function AppShell() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-card focus:text-card-foreground focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-ring"
            >
                Skip to main content
            </a>

            <div className="hidden lg:flex">
                <Sidebar />
            </div>

            <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                <Header onMenuClick={() => setMobileNavOpen(true)} />
                <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
