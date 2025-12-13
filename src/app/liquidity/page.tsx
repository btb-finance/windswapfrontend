'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import Link from 'next/link';

type Tab = 'add' | 'positions';

export default function LiquidityPage() {
    const { isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<Tab>('add');

    // Placeholder positions
    const positions = [
        {
            id: 1,
            type: 'V2',
            token0: 'SEI',
            token1: 'USDC',
            poolType: 'Volatile',
            liquidity: '$1,234.56',
            fee: '0.3%',
            apy: '12.5%',
        },
        {
            id: 2,
            type: 'CL',
            token0: 'SEI',
            token1: 'USDT',
            poolType: 'Concentrated',
            liquidity: '$5,678.90',
            fee: '0.05%',
            apy: '24.8%',
            range: '0.95 - 1.05',
        },
    ];

    return (
        <div className="container mx-auto px-6">
            {/* Page Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold mb-4">
                    <span className="gradient-text">Liquidity</span> Management
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Provide liquidity to earn trading fees and YAKA emissions.
                </p>
            </motion.div>

            {/* Tabs */}
            <div className="flex justify-center mb-8">
                <div className="glass p-1 rounded-xl inline-flex">
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${activeTab === 'add'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Add Liquidity
                    </button>
                    <button
                        onClick={() => setActiveTab('positions')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${activeTab === 'positions'
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        My Positions
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'add' && (
                <motion.div
                    className="max-w-md mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-6">Add Liquidity</h2>

                        {/* Pool Type Selection */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block">Pool Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-left">
                                    <div className="font-semibold mb-1">V2 Pool</div>
                                    <div className="text-xs text-gray-400">Classic AMM, full range</div>
                                </button>
                                <button className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition">
                                    <div className="font-semibold mb-1">CL Pool</div>
                                    <div className="text-xs text-gray-400">Concentrated liquidity</div>
                                </button>
                            </div>
                        </div>

                        {/* Token Selection Placeholder */}
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 mb-2 block">Token A</label>
                            <button className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:bg-white/10 transition">
                                <span className="text-gray-400">Select token</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block">Token B</label>
                            <button className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:bg-white/10 transition">
                                <span className="text-gray-400">Select token</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Pool Type (Stable/Volatile) */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block">Pool Stability</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition">
                                    Volatile
                                </button>
                                <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition">
                                    Stable
                                </button>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            className="w-full btn-primary py-4"
                            disabled={!isConnected}
                        >
                            {isConnected ? 'Continue' : 'Connect Wallet'}
                        </button>
                    </div>
                </motion.div>
            )}

            {activeTab === 'positions' && (
                <motion.div
                    className="max-w-4xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {!isConnected ? (
                        <div className="glass-card p-12 text-center">
                            <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                            <p className="text-gray-400 mb-6">Connect your wallet to view your positions</p>
                        </div>
                    ) : positions.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <h3 className="text-xl font-semibold mb-2">No Positions Found</h3>
                            <p className="text-gray-400 mb-6">You don&apos;t have any liquidity positions yet</p>
                            <button
                                onClick={() => setActiveTab('add')}
                                className="btn-primary"
                            >
                                Add Liquidity
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {positions.map((position, index) => (
                                <motion.div
                                    key={position.id}
                                    className="glass-card p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Token Icons */}
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                                                    {position.token0[0]}
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold absolute -right-3 top-0 border-2 border-bg-primary">
                                                    {position.token1[0]}
                                                </div>
                                            </div>

                                            {/* Pool Info */}
                                            <div className="ml-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-lg">
                                                        {position.token0}/{position.token1}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${position.type === 'CL' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                                                        }`}>
                                                        {position.type}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    {position.poolType} • {position.fee} fee
                                                    {position.range && ` • Range: ${position.range}`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <div className="text-sm text-gray-400">Liquidity</div>
                                                <div className="font-semibold">{position.liquidity}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-400">APY</div>
                                                <div className="font-semibold text-green-400">{position.apy}</div>
                                            </div>
                                            <button className="btn-secondary py-2">
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Info Cards */}
            <motion.div
                className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-3">V2 Pools</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Classic AMM pools with full-range liquidity. Support for stable and volatile pairs with optimized curves.
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Full range liquidity provision</li>
                        <li>• Stable pools for correlated assets</li>
                        <li>• Earn trading fees + YAKA emissions</li>
                    </ul>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-3">Slipstream CL</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Concentrated liquidity for capital-efficient trading. Provide liquidity within custom price ranges.
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Custom price ranges for higher capital efficiency</li>
                        <li>• NFT position management</li>
                        <li>• Stake positions in gauges for emissions</li>
                    </ul>
                </div>
            </motion.div>
        </div>
    );
}
