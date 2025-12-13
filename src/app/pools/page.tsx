'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type PoolType = 'all' | 'v2' | 'cl';
type SortBy = 'tvl' | 'apr' | 'volume';

export default function PoolsPage() {
    const [poolType, setPoolType] = useState<PoolType>('all');
    const [sortBy, setSortBy] = useState<SortBy>('tvl');
    const [search, setSearch] = useState('');

    // Placeholder pool data
    const pools = [
        {
            id: 1,
            type: 'V2',
            token0: { symbol: 'SEI', icon: '🔵' },
            token1: { symbol: 'USDC', icon: '💵' },
            stable: false,
            fee: '0.3%',
            tvl: '$2,450,000',
            volume24h: '$890,000',
            apr: '23.5%',
            hasGauge: true,
        },
        {
            id: 2,
            type: 'CL',
            token0: { symbol: 'SEI', icon: '🔵' },
            token1: { symbol: 'USDT', icon: '💵' },
            stable: false,
            fee: '0.05%',
            tvl: '$1,890,000',
            volume24h: '$1,230,000',
            apr: '31.2%',
            hasGauge: true,
        },
        {
            id: 3,
            type: 'V2',
            token0: { symbol: 'USDC', icon: '💵' },
            token1: { symbol: 'USDT', icon: '💵' },
            stable: true,
            fee: '0.05%',
            tvl: '$5,670,000',
            volume24h: '$2,340,000',
            apr: '8.4%',
            hasGauge: true,
        },
        {
            id: 4,
            type: 'CL',
            token0: { symbol: 'YAKA', icon: '⭐' },
            token1: { symbol: 'SEI', icon: '🔵' },
            stable: false,
            fee: '0.3%',
            tvl: '$890,000',
            volume24h: '$345,000',
            apr: '45.8%',
            hasGauge: true,
        },
    ];

    const filteredPools = pools.filter((pool) => {
        if (poolType === 'v2' && pool.type !== 'V2') return false;
        if (poolType === 'cl' && pool.type !== 'CL') return false;
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                pool.token0.symbol.toLowerCase().includes(searchLower) ||
                pool.token1.symbol.toLowerCase().includes(searchLower)
            );
        }
        return true;
    });

    return (
        <div className="container mx-auto px-6">
            {/* Page Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold mb-4">
                    <span className="gradient-text">Pool</span> Explorer
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Discover pools, compare APRs, and find the best opportunities.
                </p>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {/* Pool Type Toggle */}
                <div className="glass p-1 rounded-xl inline-flex">
                    {(['all', 'v2', 'cl'] as PoolType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setPoolType(type)}
                            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${poolType === type
                                    ? 'bg-primary text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {type === 'all' ? 'All Pools' : type === 'v2' ? 'V2 Pools' : 'CL Pools'}
                        </button>
                    ))}
                </div>

                {/* Search & Sort */}
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search pools..."
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary w-48"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary cursor-pointer"
                    >
                        <option value="tvl">Sort by TVL</option>
                        <option value="apr">Sort by APR</option>
                        <option value="volume">Sort by Volume</option>
                    </select>
                </div>
            </motion.div>

            {/* Pools Table */}
            <motion.div
                className="glass-card overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm text-gray-400 font-medium">
                    <div className="col-span-4">Pool</div>
                    <div className="col-span-1 text-center">Type</div>
                    <div className="col-span-1 text-center">Fee</div>
                    <div className="col-span-2 text-right">TVL</div>
                    <div className="col-span-2 text-right">Volume 24H</div>
                    <div className="col-span-1 text-right">APR</div>
                    <div className="col-span-1 text-center">Action</div>
                </div>

                {/* Table Body */}
                {filteredPools.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        No pools found matching your criteria
                    </div>
                ) : (
                    filteredPools.map((pool, index) => (
                        <motion.div
                            key={pool.id}
                            className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition items-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                        >
                            {/* Pool */}
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                                        {pool.token0.icon}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-lg absolute -right-2 top-0 border-2 border-bg-primary">
                                        {pool.token1.icon}
                                    </div>
                                </div>
                                <div className="ml-2">
                                    <div className="font-semibold">
                                        {pool.token0.symbol}/{pool.token1.symbol}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {pool.stable ? 'Stable' : 'Volatile'}
                                        {pool.hasGauge && <span className="ml-2 text-green-400">• Gauge</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Type */}
                            <div className="col-span-1 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${pool.type === 'CL' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                                    }`}>
                                    {pool.type}
                                </span>
                            </div>

                            {/* Fee */}
                            <div className="col-span-1 text-center text-gray-400">{pool.fee}</div>

                            {/* TVL */}
                            <div className="col-span-2 text-right font-medium">{pool.tvl}</div>

                            {/* Volume */}
                            <div className="col-span-2 text-right text-gray-400">{pool.volume24h}</div>

                            {/* APR */}
                            <div className="col-span-1 text-right font-semibold text-green-400">{pool.apr}</div>

                            {/* Action */}
                            <div className="col-span-1 text-center">
                                <Link href="/liquidity">
                                    <button className="btn-secondary py-1.5 px-3 text-sm">
                                        Deposit
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Stats Summary */}
            <motion.div
                className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="stat-card">
                    <p className="text-sm text-gray-400 mb-1">Total Value Locked</p>
                    <p className="text-2xl font-bold">$10.9M</p>
                </div>
                <div className="stat-card">
                    <p className="text-sm text-gray-400 mb-1">24H Volume</p>
                    <p className="text-2xl font-bold">$4.8M</p>
                </div>
                <div className="stat-card">
                    <p className="text-sm text-gray-400 mb-1">Active Pools</p>
                    <p className="text-2xl font-bold">{pools.length}</p>
                </div>
            </motion.div>
        </div>
    );
}
