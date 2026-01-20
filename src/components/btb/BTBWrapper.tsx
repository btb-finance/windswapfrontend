'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { motion } from 'framer-motion';
import {
    useBTBBalance,
    useBTBBBalance,
    useBTBAllowance,
    useBTBApprove,
    useBTBBMint,
    useBTBBRedeem,
} from '@/hooks/useBTBContracts';
import { BTB_CONTRACTS } from '@/config/contracts';
import { ethereum } from '@/config/chains';

export function BTBWrapper() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnEthereum = chainId === ethereum.id;

    const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');
    const [amount, setAmount] = useState('');

    // Balances
    const { data: btbBalance, refetch: refetchBTB } = useBTBBalance(address);
    const { data: btbbBalance, refetch: refetchBTBB } = useBTBBBalance(address);
    const { data: allowance, refetch: refetchAllowance } = useBTBAllowance(
        address,
        BTB_CONTRACTS.BTBB as `0x${string}`
    );

    // Transactions
    const { approve, isPending: isApproving, isSuccess: approveSuccess } = useBTBApprove();
    const { mint, isPending: isMinting, isSuccess: mintSuccess } = useBTBBMint();
    const { redeem, isPending: isRedeeming, isSuccess: redeemSuccess } = useBTBBRedeem();

    const balance = mode === 'wrap' ? btbBalance : btbbBalance;
    const parsedAmount = amount ? parseUnits(amount, 18) : BigInt(0);
    const needsApproval = mode === 'wrap' && allowance !== undefined && parsedAmount > allowance;

    // Refetch on success
    useEffect(() => {
        if (approveSuccess || mintSuccess || redeemSuccess) {
            refetchBTB();
            refetchBTBB();
            refetchAllowance();
            setAmount('');
        }
    }, [approveSuccess, mintSuccess, redeemSuccess]);

    const handleMax = () => {
        if (balance) {
            setAmount(formatUnits(balance, 18));
        }
    };

    const handleAction = () => {
        if (!parsedAmount) return;

        if (mode === 'wrap') {
            if (needsApproval) {
                approve(BTB_CONTRACTS.BTBB as `0x${string}`, parsedAmount);
            } else {
                mint(parsedAmount);
            }
        } else {
            redeem(parsedAmount);
        }
    };

    const isPending = isApproving || isMinting || isRedeeming;

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4">Token Wrapper</h2>
                <p className="text-white/60">Connect wallet to wrap/unwrap tokens</p>
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
                <h2 className="text-xl font-bold mb-4">Token Wrapper</h2>
                <p className="text-white/60 mb-4">Switch to Ethereum to wrap/unwrap tokens</p>
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
            <h2 className="text-xl font-bold mb-6">Token Wrapper</h2>

            {/* Mode Toggle */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                <button
                    onClick={() => setMode('wrap')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${mode === 'wrap'
                        ? 'bg-primary text-white'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Wrap BTB → BTBB
                </button>
                <button
                    onClick={() => setMode('unwrap')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${mode === 'unwrap'
                        ? 'bg-primary text-white'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Unwrap BTBB → BTB
                </button>
            </div>

            {/* Amount Input */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex justify-between mb-2">
                    <span className="text-white/50 text-sm">Amount</span>
                    <span className="text-white/50 text-sm">
                        Balance: {balance ? Number(formatUnits(balance, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0'}{' '}
                        {mode === 'wrap' ? 'BTB' : 'BTBB'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
                    />
                    <button
                        onClick={handleMax}
                        className="px-3 py-1 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 text-sm font-medium"
                    >
                        MAX
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <p className="text-blue-300 text-sm">
                    {mode === 'wrap' ? (
                        <>
                            Wrapping BTB to BTBB is 1:1. BTBB has a 1% transfer tax that funds NFT staking rewards.
                        </>
                    ) : (
                        <>
                            Unwrapping BTBB to BTB is 1:1. No tax is applied when unwrapping.
                        </>
                    )}
                </p>
            </div>

            {/* Action Button */}
            <button
                onClick={handleAction}
                disabled={!parsedAmount || isPending}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${!parsedAmount || isPending
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'btn-primary hover:scale-[1.02]'
                    }`}
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                    </span>
                ) : needsApproval ? (
                    'Approve BTB'
                ) : mode === 'wrap' ? (
                    'Wrap to BTBB'
                ) : (
                    'Unwrap to BTB'
                )}
            </button>
        </motion.div>
    );
}
