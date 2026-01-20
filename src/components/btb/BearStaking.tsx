'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { formatUnits } from 'viem';
import { motion } from 'framer-motion';
import {
    useBearNFTBalance,
    useUserStakedCount,
    usePendingRewardsDetailed,
    useIsApprovedForStaking,
    useNFTApproveForStaking,
    useStakeNFTs,
    useUnstakeNFTs,
    useClaimRewards,
    useStakingAPR,
} from '@/hooks/useBTBContracts';
import { ethereum } from '@/config/chains';

export function BearStaking() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnEthereum = chainId === ethereum.id;

    const [unstakeCount, setUnstakeCount] = useState(1);
    const [selectedTokenIds, setSelectedTokenIds] = useState<bigint[]>([]);

    // Data
    const { data: nftBalance, refetch: refetchNFTBalance } = useBearNFTBalance(address);
    const { data: stakedCount, refetch: refetchStakedCount } = useUserStakedCount(address);
    const { data: pendingRewards, refetch: refetchPendingRewards } = usePendingRewardsDetailed(address);
    const { data: isApproved, refetch: refetchApproval } = useIsApprovedForStaking(address);
    const { data: apr } = useStakingAPR();

    // Transactions
    const { approveAll, isPending: isApproving, isSuccess: approveSuccess } = useNFTApproveForStaking();
    const { stake, isPending: isStaking, isSuccess: stakeSuccess } = useStakeNFTs();
    const { unstake, isPending: isUnstaking, isSuccess: unstakeSuccess } = useUnstakeNFTs();
    const { claim, isPending: isClaiming, isSuccess: claimSuccess } = useClaimRewards();

    const hasNFTs = nftBalance && nftBalance > BigInt(0);
    const hasStaked = stakedCount && stakedCount > BigInt(0);
    const hasPendingRewards = pendingRewards && pendingRewards[0] > BigInt(0);

    // Refetch on success
    useEffect(() => {
        if (approveSuccess || stakeSuccess || unstakeSuccess || claimSuccess) {
            refetchNFTBalance();
            refetchStakedCount();
            refetchPendingRewards();
            refetchApproval();
            setUnstakeCount(1);
            setSelectedTokenIds([]);
        }
    }, [approveSuccess, stakeSuccess, unstakeSuccess, claimSuccess]);

    const formatNumber = (value: bigint | undefined, decimals = 18) => {
        if (!value) return '0';
        const formatted = formatUnits(value, decimals);
        return Number(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    const formatAPR = (value: bigint | undefined) => {
        if (!value) return '0';
        return (Number(value) / 100).toFixed(2);
    };

    const handleStake = () => {
        if (!isApproved) {
            approveAll();
        } else {
            // For simplicity, stake all available NFTs
            // In production, you'd fetch the actual token IDs
            const tokenIds: bigint[] = [];
            for (let i = 0; i < Number(nftBalance || BigInt(0)); i++) {
                // This is a placeholder - in production you'd get actual token IDs
                tokenIds.push(BigInt(i + 1));
            }
            if (tokenIds.length > 0) {
                stake(tokenIds);
            }
        }
    };

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4">Bear Staking</h2>
                <p className="text-white/60">Connect wallet to stake Bear NFTs</p>
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
                <h2 className="text-xl font-bold mb-4">Bear Staking</h2>
                <p className="text-white/60 mb-4">Switch to Ethereum to stake Bear NFTs</p>
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
            className="glass-card p-3 sm:p-4 rounded-2xl"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Bear Staking</h2>
                {apr && (
                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                        APR: {formatAPR(apr)}%
                    </div>
                )}
            </div>

            {/* Staking Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">Available to Stake</p>
                    <p className="text-2xl font-bold text-white">
                        {nftBalance?.toString() || '0'} NFTs
                    </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">Staked</p>
                    <p className="text-2xl font-bold text-purple-400">
                        {stakedCount?.toString() || '0'} NFTs
                    </p>
                </div>
            </div>

            {/* Pending Rewards */}
            {hasPendingRewards && (
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-4 mb-6 border border-emerald-500/20">
                    <p className="text-white/50 text-sm mb-2">Pending Rewards</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-white/60 text-xs">Gross</p>
                            <p className="text-lg font-bold text-white">
                                {formatNumber(pendingRewards?.[0])}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs">Tax (1%)</p>
                            <p className="text-lg font-bold text-red-400">
                                -{formatNumber(pendingRewards?.[2])}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs">Net</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {formatNumber(pendingRewards?.[1])}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => claim()}
                        disabled={isClaiming}
                        className="w-full mt-4 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                        {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                    </button>
                </div>
            )}

            {/* Stake Section */}
            {hasNFTs && (
                <div className="mb-4">
                    <button
                        onClick={handleStake}
                        disabled={isApproving || isStaking}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isApproving || isStaking
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : 'btn-primary hover:scale-[1.02]'
                            }`}
                    >
                        {isApproving ? (
                            'Approving...'
                        ) : isStaking ? (
                            'Staking...'
                        ) : !isApproved ? (
                            'Approve NFTs for Staking'
                        ) : (
                            `Stake ${nftBalance?.toString() || '0'} NFTs`
                        )}
                    </button>
                </div>
            )}

            {/* Unstake Section */}
            {hasStaked && (
                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-3">Unstake NFTs</p>
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={() => setUnstakeCount(c => Math.max(1, c - 1))}
                            disabled={unstakeCount <= 1}
                            className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl font-bold hover:bg-white/20 disabled:opacity-50"
                        >
                            −
                        </button>
                        <span className="text-2xl font-bold text-white flex-1 text-center">
                            {unstakeCount}
                        </span>
                        <button
                            onClick={() => setUnstakeCount(c => Math.min(Number(stakedCount), c + 1))}
                            disabled={unstakeCount >= Number(stakedCount)}
                            className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl font-bold hover:bg-white/20 disabled:opacity-50"
                        >
                            +
                        </button>
                    </div>
                    <button
                        onClick={() => unstake(unstakeCount)}
                        disabled={isUnstaking}
                        className="w-full py-3 rounded-xl font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                        {isUnstaking ? 'Unstaking...' : `Unstake ${unstakeCount} NFT${unstakeCount > 1 ? 's' : ''}`}
                    </button>
                </div>
            )}

            {/* No NFTs State */}
            {!hasNFTs && !hasStaked && (
                <div className="text-center py-8 text-white/50">
                    <p className="text-4xl mb-3">🐻</p>
                    <p>You don&apos;t have any Bear NFTs</p>
                    <p className="text-sm">Mint some NFTs to start earning rewards!</p>
                </div>
            )}
        </motion.div>
    );
}
