'use client';

import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useStakingStats,
    useUserStakedCount,
    usePendingRewardsDetailed,
    useBTBBalance,
    useBTBBBalance,
    useBearNFTBalance,
    useTotalRewardsDistributed,
} from '@/hooks/useBTBContracts';
import { ethereum } from '@/config/chains';
import { BTBWrapper } from './BTBWrapper';
import { BearNFTMint } from './BearNFTMint';
import { BearStaking } from './BearStaking';

export function BTBDashboard() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnEthereum = chainId === ethereum.id;

    const [activeTab, setActiveTab] = useState<'info' | 'wrap' | 'mint' | 'stake'>('info');

    // Global stats
    const { data: stakingStats, isLoading: statsLoading } = useStakingStats();

    // User stats
    const { data: btbBalance } = useBTBBalance(address);
    const { data: btbbBalance } = useBTBBBalance(address);
    const { data: nftBalance } = useBearNFTBalance(address);
    const { data: stakedCount } = useUserStakedCount(address);
    const { data: pendingRewards } = usePendingRewardsDetailed(address);

    const formatNumber = (value: bigint | undefined, decimals = 18) => {
        if (!value) return '0';
        const formatted = formatUnits(value, decimals);
        return Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    const formatAPR = (value: bigint | undefined) => {
        if (!value) return '0';
        // APR is in basis points * 100 (e.g., 500000 = 50%)
        return (Number(value) / 100).toFixed(2);
    };

    const tabConfig = [
        { key: 'info' as const, label: 'Info', icon: '📊' },
        { key: 'wrap' as const, label: 'Wrap', icon: '🔄' },
        { key: 'mint' as const, label: 'Mint', icon: '🐻' },
        { key: 'stake' as const, label: 'Stake', icon: '⛏️' },
    ];

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4 gradient-text">BTB Finance Dashboard</h2>
                <p className="text-white/60">Connect your wallet to view your BTB Finance portfolio</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Compact Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-xl sm:text-2xl font-bold">
                    <span className="gradient-text">BTB</span> Finance
                </h1>
                <p className="text-xs sm:text-sm text-gray-400">
                    Bear Time Bear Ecosystem
                </p>
            </motion.div>

            {/* Network Banner */}
            <motion.div
                className={`p-3 rounded-xl border ${isOnEthereum
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
                    : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="text-xl">{isOnEthereum ? '🌲' : '⚠️'}</div>
                        <div>
                            <div className="text-xs text-gray-400">Network Status</div>
                            <div className={`font-bold ${isOnEthereum ? 'text-green-400' : 'text-blue-400'}`}>
                                {isOnEthereum ? 'Connected to Ethereum' : 'Incorrect Network'}
                            </div>
                        </div>
                    </div>
                    {!isOnEthereum && (
                        <button
                            onClick={() => switchChain({ chainId: ethereum.id })}
                            className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition flex items-center gap-2"
                        >
                            Switch to Ethereum
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="glass-card p-2 sm:p-3 text-center">
                    <div className="text-[10px] text-gray-400">APR</div>
                    <div className="text-sm sm:text-lg font-bold text-purple-400">
                        {statsLoading ? '...' : formatAPR(stakingStats?.[4])}%
                    </div>
                </div>
                <div className="glass-card p-2 sm:p-3 text-center">
                    <div className="text-[10px] text-gray-400">Total Staked</div>
                    <div className="text-sm sm:text-lg font-bold">
                        {statsLoading ? '...' : formatNumber(stakingStats?.[0], 0)}
                    </div>
                </div>
                <div className="glass-card p-2 sm:p-3 text-center bg-emerald-500/10">
                    <div className="text-[10px] text-gray-400">Distributed</div>
                    <div className="text-sm sm:text-lg font-bold text-emerald-400">
                        {formatNumber(stakingStats?.[1])}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border-2 flex items-center justify-center gap-2 ${activeTab === tab.key
                            ? 'bg-gradient-to-r from-primary to-secondary text-white border-primary shadow-lg shadow-primary/30'
                            : 'bg-white/5 text-gray-300 border-white/10 hover:border-primary/50 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <span className="text-base">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            {/* User Portfolio */}
                            <div className="glass-card p-4 rounded-2xl">
                                <h3 className="text-lg font-bold mb-4 text-white">Your Portfolio</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-white/50 text-xs mb-1">BTB Balance</p>
                                        <p className="text-lg font-bold text-white">
                                            {formatNumber(btbBalance)}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-white/50 text-xs mb-1">BTBB Balance</p>
                                        <p className="text-lg font-bold text-emerald-400">
                                            {formatNumber(btbbBalance)}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-white/50 text-xs mb-1">Bear NFTs</p>
                                        <p className="text-lg font-bold text-amber-400">
                                            {nftBalance?.toString() || '0'}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-white/10">
                                        <p className="text-white/50 text-xs mb-1">Staked NFTs</p>
                                        <p className="text-lg font-bold text-purple-400">
                                            {stakedCount?.toString() || '0'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Pending Rewards */}
                            {pendingRewards && (pendingRewards[0] > BigInt(0)) && (
                                <div className="glass-card p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                                    <h3 className="text-lg font-bold mb-4 text-white">Pending Rewards</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <p className="text-white/50 text-xs mb-1">Gross</p>
                                            <p className="text-lg font-bold text-white">
                                                {formatNumber(pendingRewards[0])}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-xs mb-1">Tax</p>
                                            <p className="text-lg font-bold text-red-400">
                                                -{formatNumber(pendingRewards[2])}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-xs mb-1">Net</p>
                                            <p className="text-lg font-bold text-emerald-400">
                                                {formatNumber(pendingRewards[1])}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions Guide */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/40">
                                <div className="p-2 bg-white/5 rounded-lg">
                                    Step 1: Get BTB & Wrap
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    Step 2: Mint Bear NFT
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg">
                                    Step 3: Stake & Earn
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'wrap' && (
                        <BTBWrapper />
                    )}

                    {activeTab === 'mint' && (
                        <BearNFTMint />
                    )}

                    {activeTab === 'stake' && (
                        <BearStaking />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
