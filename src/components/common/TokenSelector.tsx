'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Token, DEFAULT_TOKEN_LIST } from '@/config/tokens';

interface TokenSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: Token) => void;
    selectedToken?: Token;
    excludeToken?: Token;
}

export function TokenSelector({
    isOpen,
    onClose,
    onSelect,
    selectedToken,
    excludeToken,
}: TokenSelectorProps) {
    const [search, setSearch] = useState('');
    const [filteredTokens, setFilteredTokens] = useState(DEFAULT_TOKEN_LIST);

    useEffect(() => {
        const filtered = DEFAULT_TOKEN_LIST.filter((token) => {
            // Exclude the already selected token in the other input
            if (excludeToken && token.address === excludeToken.address) return false;

            // Filter by search
            if (search) {
                const searchLower = search.toLowerCase();
                return (
                    token.symbol.toLowerCase().includes(searchLower) ||
                    token.name.toLowerCase().includes(searchLower) ||
                    token.address.toLowerCase().includes(searchLower)
                );
            }
            return true;
        });
        setFilteredTokens(filtered);
    }, [search, excludeToken]);

    const handleSelect = (token: Token) => {
        onSelect(token);
        onClose();
        setSearch('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-md mx-4"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                    <div className="glass-card p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Select Token</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 transition"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or address"
                                className="input-field text-base"
                                autoFocus
                            />
                        </div>

                        {/* Token List */}
                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {filteredTokens.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    No tokens found
                                </div>
                            ) : (
                                filteredTokens.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => handleSelect(token)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition hover:bg-white/5 ${selectedToken?.address === token.address
                                                ? 'bg-primary/10 border border-primary/30'
                                                : ''
                                            }`}
                                    >
                                        {/* Token Icon */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                            {token.logoURI ? (
                                                <img
                                                    src={token.logoURI}
                                                    alt={token.symbol}
                                                    className="w-8 h-8 rounded-full"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-lg font-bold">{token.symbol[0]}</span>
                                            )}
                                        </div>

                                        {/* Token Info */}
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold">{token.symbol}</p>
                                            <p className="text-sm text-gray-400">{token.name}</p>
                                        </div>

                                        {/* Balance Placeholder */}
                                        <p className="text-sm text-gray-400">--</p>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Custom Token Import */}
                        <div className="mt-4 pt-4 border-t border-white/5 text-center">
                            <p className="text-sm text-gray-400">
                                Can&apos;t find your token? Paste the address above.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
