'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { CL_CONTRACTS, V2_CONTRACTS } from '@/config/contracts';

// CLGauge ABI for staking operations
const CL_GAUGE_ABI = [
    {
        inputs: [{ name: 'depositor', type: 'address' }],
        name: 'stakedValues',
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'depositor', type: 'address' }],
        name: 'stakedLength',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'rewards',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'rewardRate',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'rewardToken',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'withdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'getReward',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pool',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Voter ABI
const VOTER_ABI = [
    {
        inputs: [{ name: 'pool', type: 'address' }],
        name: 'gauges',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'gauge', type: 'address' }],
        name: 'isAlive',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Position Manager ABI
const NFT_POSITION_MANAGER_ABI = [
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'positions',
        outputs: [
            { name: 'nonce', type: 'uint96' },
            { name: 'operator', type: 'address' },
            { name: 'token0', type: 'address' },
            { name: 'token1', type: 'address' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'tickLower', type: 'int24' },
            { name: 'tickUpper', type: 'int24' },
            { name: 'liquidity', type: 'uint128' },
            { name: 'feeGrowthInside0LastX128', type: 'uint256' },
            { name: 'feeGrowthInside1LastX128', type: 'uint256' },
            { name: 'tokensOwed0', type: 'uint128' },
            { name: 'tokensOwed1', type: 'uint128' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

interface StakedPosition {
    tokenId: bigint;
    gaugeAddress: string;
    poolAddress: string;
    token0: string;
    token1: string;
    token0Symbol: string;
    token1Symbol: string;
    tickSpacing: number;
    liquidity: bigint;
    rewards: bigint;
    rewardRate: bigint;
}

// Known token symbols
const TOKEN_SYMBOLS: Record<string, string> = {
    '0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7': 'WSEI',
    '0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392': 'USDC',
    '0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1': 'USDC',
    '0x5f0e07dfee5832faa00c63f2d33a0d79150e8598': 'YAKA',
};

// Known pools with gauges
const KNOWN_POOLS = [
    '0x98daf006cb4c338d9c527ec54e0cee3308ccff47', // USDC/WSEI 0.05%
    '0x6957f330590654856BBaE2762b0c2F0E7A124eD8', // USDC/WSEI 0.30%
];

export default function StakePage() {
    const { isConnected, address } = useAccount();
    const [stakedPositions, setStakedPositions] = useState<StakedPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const { writeContractAsync } = useWriteContract();

    // Fetch staked positions
    useEffect(() => {
        const fetchStakedPositions = async () => {
            if (!address) {
                setStakedPositions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const positions: StakedPosition[] = [];

            try {
                // Check each known pool for a gauge
                for (const poolAddress of KNOWN_POOLS) {
                    // Get gauge address for pool
                    const gaugeResult = await fetch('https://evm-rpc.sei-apis.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'eth_call',
                            params: [{
                                to: V2_CONTRACTS.Voter,
                                data: `0xb9a09fd5${poolAddress.slice(2).toLowerCase().padStart(64, '0')}`
                            }, 'latest']
                        })
                    }).then(r => r.json());

                    const gaugeAddress = '0x' + gaugeResult.result?.slice(26);
                    if (!gaugeAddress || gaugeAddress === '0x0000000000000000000000000000000000000000') continue;

                    // Get staked token IDs for this user
                    const stakedResult = await fetch('https://evm-rpc.sei-apis.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'eth_call',
                            params: [{
                                to: gaugeAddress,
                                data: `0x17e710a8${address.slice(2).toLowerCase().padStart(64, '0')}` // stakedValues(address)
                            }, 'latest']
                        })
                    }).then(r => r.json());

                    if (!stakedResult.result || stakedResult.result === '0x') continue;

                    // Parse the array of token IDs
                    const data = stakedResult.result.slice(2);
                    const offset = parseInt(data.slice(0, 64), 16);
                    const length = parseInt(data.slice(64, 128), 16);

                    for (let i = 0; i < length; i++) {
                        const tokenIdHex = data.slice(128 + i * 64, 128 + (i + 1) * 64);
                        const tokenId = BigInt('0x' + tokenIdHex);

                        // Get position details
                        const positionResult = await fetch('https://evm-rpc.sei-apis.com', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_call',
                                params: [{
                                    to: CL_CONTRACTS.NonfungiblePositionManager,
                                    data: `0x99fbab88${tokenId.toString(16).padStart(64, '0')}` // positions(uint256)
                                }, 'latest']
                            })
                        }).then(r => r.json());

                        if (!positionResult.result) continue;

                        const posData = positionResult.result.slice(2);
                        const token0 = '0x' + posData.slice(64 + 24, 128);
                        const token1 = '0x' + posData.slice(128 + 24, 192);
                        const tickSpacing = parseInt(posData.slice(192, 256), 16);
                        const liquidityHex = posData.slice(320, 384);
                        const liquidity = BigInt('0x' + liquidityHex);

                        // Get rewards for this token
                        const rewardsResult = await fetch('https://evm-rpc.sei-apis.com', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_call',
                                params: [{
                                    to: gaugeAddress,
                                    data: `0x0fb5a6b4${tokenId.toString(16).padStart(64, '0')}` // rewards(uint256)
                                }, 'latest']
                            })
                        }).then(r => r.json());

                        const rewards = rewardsResult.result ? BigInt(rewardsResult.result) : BigInt(0);

                        // Get reward rate
                        const rateResult = await fetch('https://evm-rpc.sei-apis.com', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_call',
                                params: [{
                                    to: gaugeAddress,
                                    data: '0x7b0a47ee' // rewardRate()
                                }, 'latest']
                            })
                        }).then(r => r.json());

                        const rewardRate = rateResult.result ? BigInt(rateResult.result) : BigInt(0);

                        positions.push({
                            tokenId,
                            gaugeAddress,
                            poolAddress,
                            token0,
                            token1,
                            token0Symbol: TOKEN_SYMBOLS[token0.toLowerCase()] || token0.slice(0, 8),
                            token1Symbol: TOKEN_SYMBOLS[token1.toLowerCase()] || token1.slice(0, 8),
                            tickSpacing,
                            liquidity,
                            rewards,
                            rewardRate,
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching staked positions:', err);
            }

            setStakedPositions(positions);
            setLoading(false);
        };

        fetchStakedPositions();
    }, [address]);

    // Claim rewards
    const handleClaimRewards = async (gaugeAddress: string) => {
        if (!address) return;
        setActionLoading('claim-' + gaugeAddress);
        try {
            const hash = await writeContractAsync({
                address: gaugeAddress as Address,
                abi: CL_GAUGE_ABI,
                functionName: 'getReward',
                args: [address],
            });
            setTxHash(hash);
        } catch (err) {
            console.error('Claim rewards error:', err);
        }
        setActionLoading(null);
    };

    // Withdraw (unstake) position
    const handleWithdraw = async (gaugeAddress: string, tokenId: bigint) => {
        setActionLoading('withdraw-' + tokenId.toString());
        try {
            const hash = await writeContractAsync({
                address: gaugeAddress as Address,
                abi: CL_GAUGE_ABI,
                functionName: 'withdraw',
                args: [tokenId],
            });
            setTxHash(hash);
            // Refresh positions
            setStakedPositions(prev => prev.filter(p => p.tokenId !== tokenId));
        } catch (err) {
            console.error('Withdraw error:', err);
        }
        setActionLoading(null);
    };

    // Format reward rate to APR (simplified)
    const formatRewardRate = (rate: bigint) => {
        if (rate === BigInt(0)) return '0';
        // Rate is per second, calculate daily
        const daily = rate * BigInt(86400);
        return formatUnits(daily, 18);
    };

    const feeMap: Record<number, string> = { 1: '0.01%', 50: '0.05%', 80: '0.25%', 100: '0.05%', 200: '0.30%' };

    return (
        <div className="container mx-auto px-6">
            {/* Page Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold mb-4">
                    <span className="gradient-text">Staking</span> Rewards
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    View your staked CL positions and claim YAKA rewards.
                </p>
            </motion.div>

            {/* TX Hash Display */}
            {txHash && (
                <motion.div
                    className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="text-green-400 text-sm">Transaction submitted!</div>
                    <a
                        href={`https://seitrace.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 text-xs break-all hover:underline"
                    >
                        {txHash}
                    </a>
                </motion.div>
            )}

            {!isConnected ? (
                <div className="text-center py-20">
                    <div className="text-gray-400 text-lg">Connect your wallet to view staked positions</div>
                </div>
            ) : loading ? (
                <div className="text-center py-20">
                    <div className="text-gray-400 text-lg">Loading staked positions...</div>
                </div>
            ) : stakedPositions.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-gray-400 text-lg mb-4">No staked positions found</div>
                    <p className="text-gray-500 text-sm">
                        Go to the Liquidity page to add liquidity and stake your CL NFTs.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary Card */}
                    <motion.div
                        className="glass-card p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h2 className="text-xl font-semibold mb-4">Staking Summary</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-white/5">
                                <div className="text-gray-400 text-xs mb-1">Staked Positions</div>
                                <div className="text-2xl font-bold text-primary">{stakedPositions.length}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                                <div className="text-gray-400 text-xs mb-1">Total YAKA Earned</div>
                                <div className="text-2xl font-bold text-secondary">
                                    {formatUnits(stakedPositions.reduce((sum, p) => sum + p.rewards, BigInt(0)), 18)}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                                <div className="text-gray-400 text-xs mb-1">Active Gauges</div>
                                <div className="text-2xl font-bold">
                                    {new Set(stakedPositions.map(p => p.gaugeAddress)).size}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5">
                                <div className="text-gray-400 text-xs mb-1">Daily YAKA Rate</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {formatRewardRate(stakedPositions[0]?.rewardRate || BigInt(0))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Staked Positions */}
                    <motion.div
                        className="glass-card p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-xl font-semibold mb-4">Staked Positions</h2>
                        <div className="space-y-4">
                            {stakedPositions.map((pos, i) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-glass-border">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center font-bold">
                                                #{pos.tokenId.toString()}
                                            </div>
                                            <div>
                                                <div className="font-semibold">
                                                    {pos.token0Symbol}/{pos.token1Symbol}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {feeMap[pos.tickSpacing] || `${pos.tickSpacing}ts`} Fee Tier
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-green-400 font-semibold">
                                                {formatUnits(pos.rewards, 18)} YAKA
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Pending Rewards
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="text-gray-400">Liquidity:</span>{' '}
                                            <span className="font-mono">{pos.liquidity.toString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Gauge:</span>{' '}
                                            <span className="font-mono text-xs">{pos.gaugeAddress.slice(0, 10)}...</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleClaimRewards(pos.gaugeAddress)}
                                            disabled={pos.rewards === BigInt(0) || !!actionLoading}
                                            className="flex-1 py-2 rounded-lg bg-primary/20 text-primary font-medium disabled:opacity-50 hover:bg-primary/30 transition"
                                        >
                                            {actionLoading === 'claim-' + pos.gaugeAddress ? 'Claiming...' : 'Claim Rewards'}
                                        </button>
                                        <button
                                            onClick={() => handleWithdraw(pos.gaugeAddress, pos.tokenId)}
                                            disabled={!!actionLoading}
                                            className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium disabled:opacity-50 hover:bg-red-500/30 transition"
                                        >
                                            {actionLoading === 'withdraw-' + pos.tokenId.toString() ? 'Withdrawing...' : 'Unstake'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Info Card */}
                    <motion.div
                        className="glass-card p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-lg font-semibold mb-3">How Staking Works</h2>
                        <div className="text-gray-400 text-sm space-y-2">
                            <p>• Stake your CL NFT positions in gauges to earn YAKA emissions</p>
                            <p>• Emissions are distributed based on votes from veYAKA holders</p>
                            <p>• Claim rewards anytime - they accumulate automatically</p>
                            <p>• Unstaking returns your NFT position to your wallet</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
