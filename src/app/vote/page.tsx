'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';

export default function VotePage() {
    const { isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<'vote' | 'lock' | 'rewards'>('vote');

    // Placeholder gauge data
    const gauges = [
        {
            id: 1,
            pool: 'SEI/USDC',
            type: 'V2',
            votes: '12.5%',
            totalVotes: '1,234,567 veYAKA',
            apr: '45.2%',
            bribes: '$12,500',
        },
        {
            id: 2,
            pool: 'SEI/USDT',
            type: 'CL',
            votes: '8.3%',
            totalVotes: '823,456 veYAKA',
            apr: '38.7%',
            bribes: '$8,200',
        },
        {
            id: 3,
            pool: 'USDC/USDT',
            type: 'V2',
            votes: '15.1%',
            totalVotes: '1,567,890 veYAKA',
            apr: '12.4%',
            bribes: '$3,400',
        },
        {
            id: 4,
            pool: 'YAKA/SEI',
            type: 'CL',
            votes: '22.4%',
            totalVotes: '2,345,678 veYAKA',
            apr: '67.8%',
            bribes: '$28,900',
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
                    <span className="gradient-text">Vote</span> & Earn
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Lock YAKA to receive veNFTs, vote on gauge emissions, and earn bribes + fees.
                </p>
            </motion.div>

            {/* Tabs */}
            <div className="flex justify-center mb-8">
                <div className="glass p-1 rounded-xl inline-flex">
                    {(['lock', 'vote', 'rewards'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg font-medium transition capitalize ${activeTab === tab
                                    ? 'bg-primary text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab === 'lock' ? 'Lock YAKA' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lock Tab */}
            {activeTab === 'lock' && (
                <motion.div
                    className="max-w-md mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-6">Create veNFT Lock</h2>

                        {/* YAKA Amount */}
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 mb-2 block">YAKA Amount</label>
                            <div className="token-input-row">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Balance: -- YAKA</span>
                                    <button className="text-sm text-primary">MAX</button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="0.0"
                                    className="w-full bg-transparent text-2xl font-medium outline-none placeholder-gray-600"
                                />
                            </div>
                        </div>

                        {/* Lock Duration */}
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block">Lock Duration</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['1 week', '1 month', '1 year', '4 years'].map((duration) => (
                                    <button
                                        key={duration}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition"
                                    >
                                        {duration}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Longer locks = more voting power (up to 4x)
                            </p>
                        </div>

                        {/* Voting Power Preview */}
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Voting Power</span>
                                <span className="font-semibold">-- veYAKA</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Lock Expires</span>
                                <span>--</span>
                            </div>
                        </div>

                        <button
                            className="w-full btn-primary py-4"
                            disabled={!isConnected}
                        >
                            {isConnected ? 'Create Lock' : 'Connect Wallet'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Vote Tab */}
            {activeTab === 'vote' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {!isConnected ? (
                        <div className="glass-card p-12 text-center max-w-md mx-auto">
                            <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                            <p className="text-gray-400 mb-6">Connect your wallet to vote on gauges</p>
                        </div>
                    ) : (
                        <>
                            {/* Your veNFTs */}
                            <div className="glass-card p-6 mb-8 max-w-4xl mx-auto">
                                <h2 className="text-lg font-semibold mb-4">Your veNFTs</h2>
                                <div className="text-center py-8 text-gray-400">
                                    <p>No veNFTs found. Lock YAKA to receive veNFTs.</p>
                                    <button
                                        onClick={() => setActiveTab('lock')}
                                        className="mt-4 btn-primary"
                                    >
                                        Lock YAKA
                                    </button>
                                </div>
                            </div>

                            {/* Gauges List */}
                            <div className="glass-card overflow-hidden max-w-4xl mx-auto">
                                <div className="p-4 border-b border-white/5">
                                    <h2 className="text-lg font-semibold">Gauges</h2>
                                </div>

                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm text-gray-400 font-medium">
                                    <div className="col-span-3">Pool</div>
                                    <div className="col-span-2 text-right">Vote Weight</div>
                                    <div className="col-span-2 text-right">Total Votes</div>
                                    <div className="col-span-2 text-right">APR</div>
                                    <div className="col-span-2 text-right">Bribes</div>
                                    <div className="col-span-1 text-center">Vote</div>
                                </div>

                                {/* Gauges */}
                                {gauges.map((gauge, index) => (
                                    <motion.div
                                        key={gauge.id}
                                        className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition items-center"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="col-span-3 flex items-center gap-2">
                                            <span className="font-semibold">{gauge.pool}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${gauge.type === 'CL' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                                                }`}>
                                                {gauge.type}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-right">{gauge.votes}</div>
                                        <div className="col-span-2 text-right text-gray-400 text-sm">{gauge.totalVotes}</div>
                                        <div className="col-span-2 text-right text-green-400 font-semibold">{gauge.apr}</div>
                                        <div className="col-span-2 text-right text-yellow-400">{gauge.bribes}</div>
                                        <div className="col-span-1 text-center">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-16 p-2 rounded-lg bg-white/5 text-center text-sm outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Submit Vote */}
                            <div className="max-w-4xl mx-auto mt-6 flex justify-end">
                                <button className="btn-primary px-8" disabled>
                                    Cast Votes
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <motion.div
                    className="max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {!isConnected ? (
                        <div className="glass-card p-12 text-center">
                            <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                            <p className="text-gray-400 mb-6">Connect your wallet to view and claim rewards</p>
                        </div>
                    ) : (
                        <>
                            {/* Claimable Rewards */}
                            <div className="glass-card p-6 mb-6">
                                <h2 className="text-lg font-semibold mb-4">Claimable Rewards</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">💵</span>
                                            <span>Trading Fees</span>
                                        </div>
                                        <span className="font-semibold">$0.00</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🎁</span>
                                            <span>Bribes</span>
                                        </div>
                                        <span className="font-semibold">$0.00</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">📈</span>
                                            <span>Rebases</span>
                                        </div>
                                        <span className="font-semibold">0.00 YAKA</span>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full btn-primary py-4">
                                Claim All Rewards
                            </button>
                        </>
                    )}
                </motion.div>
            )}

            {/* Info Section */}
            <motion.div
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">🗳️</div>
                    <h3 className="font-semibold mb-2">Vote Power</h3>
                    <p className="text-sm text-gray-400">
                        Lock YAKA for up to 4 years to maximize voting power
                    </p>
                </div>

                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">💰</div>
                    <h3 className="font-semibold mb-2">Earn Bribes</h3>
                    <p className="text-sm text-gray-400">
                        Receive bribes from protocols incentivizing their pools
                    </p>
                </div>

                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">📊</div>
                    <h3 className="font-semibold mb-2">Share Fees</h3>
                    <p className="text-sm text-gray-400">
                        Voters receive a share of trading fees from voted pools
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
