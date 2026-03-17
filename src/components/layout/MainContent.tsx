'use client';

/**
 * Main content wrapper with proper padding for header and bottom nav
 */
export function MainContent({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 pt-20 md:pt-32 pb-28 md:pb-16">
            {children}
        </main>
    );
}
