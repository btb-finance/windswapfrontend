'use client';

import { motion } from 'framer-motion';
import { BTBDashboard, BTBWrapper, BearNFTMint, BearStaking } from '@/components/btb';
import { BTB_CONTRACTS } from '@/config/contracts';
import { useAutoSwitchToEthereum } from '@/hooks/useAutoSwitchToEthereum';

export default function BTBPage() {
    // Auto-switch to Ethereum when visiting this page
    useAutoSwitchToEthereum();

    return (
        <main className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    <span className="gradient-text">BTB Finance</span>
                </h1>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                    Wrap BTB tokens, mint Bear NFTs, and stake to earn BTBB rewards from the 1% transfer tax.
                </p>

                {/* Quick Links */}
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <a
                        href={`https://etherscan.io/token/${BTB_CONTRACTS.BTB}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                    >
                        BTB Token ↗
                    </a>
                    <a
                        href={`https://etherscan.io/token/${BTB_CONTRACTS.BTBB}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                    >
                        BTBB Token ↗
                    </a>
                    <a
                        href={`https://etherscan.io/token/${BTB_CONTRACTS.BearNFT}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                    >
                        Bear NFT ↗
                    </a>
                    <a
                        href={`https://etherscan.io/address/${BTB_CONTRACTS.BearStaking}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                    >
                        Staking Contract ↗
                    </a>
                </div>
            </motion.div>

            {/* Dashboard */}
            <div className="mb-8">
                <BTBDashboard />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <BTBWrapper />
                    <BearStaking />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <BearNFTMint />

                    {/* How It Works */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-6 rounded-2xl"
                    >
                        <h3 className="text-xl font-bold mb-4">📖 How It Works</h3>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                                    1
                                </div>
                                <div>
                                    <p className="font-medium text-white">Wrap BTB → BTBB</p>
                                    <p className="text-white/50 text-sm">
                                        Convert BTB tokens to BTBB at 1:1 ratio. BTBB has a 1% transfer tax.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                                    2
                                </div>
                                <div>
                                    <p className="font-medium text-white">Mint Bear NFTs</p>
                                    <p className="text-white/50 text-sm">
                                        Purchase Bear NFTs for 0.01 ETH each. Limited to 100,000 total supply.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                                    3
                                </div>
                                <div>
                                    <p className="font-medium text-white">Stake NFTs</p>
                                    <p className="text-white/50 text-sm">
                                        Stake your Bear NFTs to earn a share of all BTBB transfer taxes.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                    4
                                </div>
                                <div>
                                    <p className="font-medium text-white">Earn BTBB Rewards</p>
                                    <p className="text-white/50 text-sm">
                                        Claim your accumulated BTBB rewards anytime. Note: claims also incur 1% tax.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Network Info Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
            >
                <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white/60 text-sm">Live on Ethereum Mainnet</span>
                </div>
            </motion.div>
        </main>
    );
}
