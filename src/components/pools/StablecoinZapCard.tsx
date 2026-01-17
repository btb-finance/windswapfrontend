'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Address, parseUnits, formatUnits } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { USDC, USDT0 } from '@/config/tokens';
import { useTokenBalance, useTokenAllowance } from '@/hooks/useToken';
import { ERC20_ABI } from '@/config/abis';
import { useToast } from '@/providers/ToastProvider';
import { haptic } from '@/hooks/useHaptic';

// StablecoinZap contract address and ABI
const STABLECOIN_ZAP_ADDRESS = '0x8dfbAC3C691BEACD54949bBd43FF8bBe869e8930' as Address;

const STABLECOIN_ZAP_ABI = [
    {
        type: 'function',
        name: 'zap',
        inputs: [
            { name: 'inputToken', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'slippageBps', type: 'uint256' },
            { name: 'minLiquidity', type: 'uint128' }
        ],
        outputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'liquidity', type: 'uint128' }
        ],
        stateMutability: 'nonpayable'
    }
] as const;

interface StablecoinZapCardProps {
    onSuccess?: () => void;
}

export function StablecoinZapCard({ onSuccess }: StablecoinZapCardProps) {
    const { address, isConnected } = useAccount();
    const toast = useToast();

    // Token selection (USDC or USDT0)
    const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT0'>('USDC');
    const [amount, setAmount] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [isZapping, setIsZapping] = useState(false);

    const token = selectedToken === 'USDC' ? USDC : USDT0;

    // Get token balance
    const { raw, rawBigInt, formatted: tokenBalance, refetch: refetchBalance } = useTokenBalance(token);

    // Check allowance
    const { allowance, refetch: refetchAllowance } = useTokenAllowance(token, STABLECOIN_ZAP_ADDRESS);

    // Contract writes
    const { writeContractAsync } = useWriteContract();

    // Parse amount
    const parsedAmount = amount ? parseUnits(amount, token.decimals) : BigInt(0);
    const needsApproval = allowance !== undefined && parsedAmount > allowance;

    // Handle max button
    const handleMax = () => {
        if (raw) {
            setAmount(raw);
        }
    };

    // Handle approval
    const handleApprove = async () => {
        if (!address) return;

        setIsApproving(true);
        haptic('medium');

        try {
            const hash = await writeContractAsync({
                address: token.address as Address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [STABLECOIN_ZAP_ADDRESS, parsedAmount],
            });

            toast.info('Approval submitted...');

            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 3000));
            await refetchAllowance();

            toast.success(`${selectedToken} approved!`);
            haptic('success');
        } catch (err: any) {
            console.error('Approval failed:', err);
            toast.error(err.shortMessage || 'Approval failed');
            haptic('error');
        } finally {
            setIsApproving(false);
        }
    };

    // Handle zap
    const handleZap = async () => {
        if (!address || parsedAmount === BigInt(0)) return;

        setIsZapping(true);
        haptic('medium');

        try {
            const hash = await writeContractAsync({
                address: STABLECOIN_ZAP_ADDRESS,
                abi: STABLECOIN_ZAP_ABI,
                functionName: 'zap',
                args: [
                    token.address as Address,
                    parsedAmount,
                    BigInt(50), // 0.5% slippage
                    BigInt(0),  // min liquidity (we accept any)
                ],
            });

            toast.info('Zap submitted! Creating LP position...');

            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 5000));

            toast.success('🎉 LP position created! Check your portfolio.');
            haptic('success');

            // Reset form
            setAmount('');
            refetchBalance();

            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Zap failed:', err);
            toast.error(err.shortMessage || 'Zap failed');
            haptic('error');
        } finally {
            setIsZapping(false);
        }
    };

    const isLoading = isApproving || isZapping;
    const hasInsufficientBalance = rawBigInt !== undefined && parsedAmount > rawBigInt;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
        >
            <div className="p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                                <span className="text-lg">⚡</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Stablecoin Zap</h3>
                            <p className="text-xs text-gray-400">Add LP with one stablecoin</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Pool</div>
                        <div className="text-sm font-medium text-white">USDC / USDT0</div>
                    </div>
                </div>

                {/* Token Selection */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setSelectedToken('USDC')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${selectedToken === 'USDC'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                            }`}
                    >
                        USDC
                    </button>
                    <button
                        onClick={() => setSelectedToken('USDT0')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${selectedToken === 'USDT0'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                            }`}
                    >
                        USDT0
                    </button>
                </div>

                {/* Amount Input */}
                <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Amount</span>
                        <span className="text-sm text-gray-400">
                            Balance: {tokenBalance ? parseFloat(tokenBalance).toFixed(2) : '0.00'} {selectedToken}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleMax}
                            className="px-3 py-1 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                            disabled={isLoading}
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-gray-900/30 rounded-lg p-3 mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tick Range</span>
                        <span className="text-white">±0.5% (Tight)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Slippage</span>
                        <span className="text-white">0.5%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Action</span>
                        <span className="text-indigo-400">Swap 50% + Add LP</span>
                    </div>
                </div>

                {/* Action Button */}
                {!isConnected ? (
                    <button
                        className="w-full py-3 rounded-xl font-bold bg-gray-700 text-gray-400 cursor-not-allowed"
                        disabled
                    >
                        Connect Wallet
                    </button>
                ) : hasInsufficientBalance ? (
                    <button
                        className="w-full py-3 rounded-xl font-bold bg-red-500/20 text-red-400 cursor-not-allowed"
                        disabled
                    >
                        Insufficient Balance
                    </button>
                ) : needsApproval ? (
                    <button
                        onClick={handleApprove}
                        disabled={isLoading || parsedAmount === BigInt(0)}
                        className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isApproving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span> Approving...
                            </span>
                        ) : (
                            `Approve ${selectedToken}`
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleZap}
                        disabled={isLoading || parsedAmount === BigInt(0)}
                        className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isZapping ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⚡</span> Zapping...
                            </span>
                        ) : (
                            '⚡ Zap into LP'
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
