'use client';

import { useState, useEffect } from 'react';

export function MigrationPopup() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        try {
            const dismissed = localStorage.getItem('windswap_popup_dismissed');
            if (dismissed !== 'true') {
                // Show popup after a short delay so page loads first
                const timer = setTimeout(() => setShow(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch {}
    }, []);

    const handleDismiss = () => {
        setShow(false);
        try {
            localStorage.setItem('windswap_popup_dismissed', 'true');
        } catch {}
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handleDismiss}>
            <div
                className="glass-card p-6 sm:p-8 max-w-md w-full border border-amber-500/30 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white transition p-1"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="text-center">
                    <div className="text-4xl mb-3">🏠</div>
                    <h2 className="text-xl font-bold mb-2 gradient-text">WindSwap is now on Base!</h2>
                    <p className="text-sm text-gray-300 mb-4">
                        We are shifting focus to <span className="font-bold text-white">Base</span> as our primary chain.
                    </p>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4 text-left">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">🎁</span>
                            <div>
                                <div className="text-sm font-bold text-amber-300 mb-1">veWIND 1:1 Airdrop</div>
                                <div className="text-xs text-amber-100/80">
                                    If you hold veWIND on WindSwap (Sei), you are eligible for a <span className="font-bold text-white">1:1 veWIND airdrop</span> on Base.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-5 text-left">
                        <div className="text-xs text-gray-400 space-y-1">
                            <div>• <span className="text-white font-medium">Sei frontend</span> sunsets on <span className="font-bold text-amber-400">May 1, 2026</span></div>
                            <div>• Contracts on Sei remain live — anyone can host them</div>
                            <div>• All future development focused on Base</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <a
                            href="https://discord.gg/pF7duV83Y"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 rounded-xl font-bold text-sm bg-[#5865F2] text-white hover:bg-[#4752C4] transition text-center"
                        >
                            💬 Read the Discord Announcement
                        </a>
                        <a
                            href="https://base.windswap.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition text-center"
                        >
                            🌟 Explore WindSwap on Base →
                        </a>
                        <button
                            onClick={handleDismiss}
                            className="text-xs text-gray-500 hover:text-gray-300 transition py-1"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}