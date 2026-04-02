'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { motion } from 'framer-motion';
import { useAutoSwitchToSei } from '@/hooks/useAutoSwitchToSei';
import { WindLogo } from '@/components/common/WindLogo';

const navLinks = [
    { href: '/swap', label: 'Swap' },
    { href: '/pools', label: 'Pools' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/vote', label: 'Vote' },
    { href: '/btb', label: 'BTB' },
    { href: '/mining', label: 'Mining' },
    { href: '/wind', label: 'Wind' },
    { href: '/migrate', label: 'Migrate' },
];

export function Header() {
    const pathname = usePathname();

    // Auto-switch back to Sei when leaving the bridge page
    useAutoSwitchToSei();

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            {/* Base Network Banner */}
            <div className="bg-[#0052FF] text-white text-xs sm:text-sm py-1.5 px-4 text-center font-medium flex justify-center items-center gap-2">
                <span>🌟 WindSwap on Base is LIVE!</span>
                <a href="https://windswap.org/" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-white/80 transition-colors flex items-center gap-1">
                    Explore now <span aria-hidden="true">&rarr;</span>
                </a>
            </div>
            <div className="glass-header border-t border-white/10">
                <div className="container mx-auto px-3 md:px-6 py-2 md:py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo - text hidden on mobile */}
                        <Link href="/" className="flex items-center gap-2 md:gap-3 hover:scale-105 active:scale-95 transition-transform">
                            <WindLogo size={36} className="md:hidden" />
                            <WindLogo size={42} className="hidden md:block" />
                            <span className="hidden sm:inline text-lg md:text-xl font-bold gradient-text">Wind Swap</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-2">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                                    >
                                        {link.label}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Wallet Connect */}
                        <WalletConnect />
                    </div>
                </div>
            </div>
        </header>
    );
}
