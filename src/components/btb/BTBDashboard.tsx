'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { formatUnits } from 'viem';
import { motion } from 'framer-motion';
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

export function BTBDashboard() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnEthereum = chainId === ethereum.id;

    // Global stats
    const { data: stakingStats, isLoading: statsLoading } = useStakingStats();
    const { data: totalRewards } = useTotalRewardsDistributed();

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

    if (!isOnEthereum) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4 gradient-text">BTB Finance Dashboard</h2>
                <p className="text-white/60 mb-4">BTB Finance is on Ethereum Mainnet. Switch networks to interact.</p>
                <button
                    onClick={() => switchChain({ chainId: ethereum.id })}
                    className="btn-primary px-6 py-2 rounded-xl font-medium"
                >
                    Switch to Ethereum
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Global Stats */}
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold mb-6 gradient-text">🐻 BTB Finance Overview</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/50 text-sm mb-1">Total NFTs Staked</p>
                        <p className="text-2xl font-bold text-white">
                            {statsLoading ? '...' : formatNumber(stakingStats?.[0], 0)}
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/50 text-sm mb-1">Rewards Distributed</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {formatNumber(stakingStats?.[1])} BTBB
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/50 text-sm mb-1">Pending to Collect</p>
                        <p className="text-2xl font-bold text-amber-400">
                            {formatNumber(stakingStats?.[2])} BTBB
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/50 text-sm mb-1">Estimated APR</p>
                        <p className="text-2xl font-bold text-purple-400">
                            {formatAPR(stakingStats?.[4])}%
                        </p>
                    </div>
                </div>
            </div>

            {/* User Portfolio */}
            <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-white">Your Portfolio</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-white/10">
                        <p className="text-white/50 text-sm mb-1">BTB Balance</p>
                        <p className="text-xl font-bold text-white">
                            {formatNumber(btbBalance)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-white/10">
                        <p className="text-white/50 text-sm mb-1">BTBB Balance</p>
                        <p className="text-xl font-bold text-emerald-400">
                            {formatNumber(btbbBalance)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-white/10">
                        <p className="text-white/50 text-sm mb-1">Bear NFTs</p>
                        <p className="text-xl font-bold text-amber-400">
                            {nftBalance?.toString() || '0'}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-white/10">
                        <p className="text-white/50 text-sm mb-1">Staked NFTs</p>
                        <p className="text-xl font-bold text-purple-400">
                            {stakedCount?.toString() || '0'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Pending Rewards */}
            {pendingRewards && (pendingRewards[0] > BigInt(0)) && (
                <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                    <h3 className="text-lg font-bold mb-4 text-white">Pending Rewards</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-white/50 text-sm mb-1">Gross Rewards</p>
                            <p className="text-xl font-bold text-white">
                                {formatNumber(pendingRewards[0])} BTBB
                            </p>
                        </div>

                        <div>
                            <p className="text-white/50 text-sm mb-1">1% Tax</p>
                            <p className="text-xl font-bold text-red-400">
                                -{formatNumber(pendingRewards[2])} BTBB
                            </p>
                        </div>

                        <div>
                            <p className="text-white/50 text-sm mb-1">Net Rewards</p>
                            <p className="text-xl font-bold text-emerald-400">
                                {formatNumber(pendingRewards[1])} BTBB
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
