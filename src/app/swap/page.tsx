'use client';

import { motion } from 'framer-motion';
import { SwapInterface } from '@/components/swap/SwapInterface';

export default function SwapPage() {
    return (
        <div className="container mx-auto px-6">
            {/* Page Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold mb-4">
                    <span className="gradient-text">Swap</span> Tokens
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Trade tokens instantly with low slippage using YAKA&apos;s V2 and Slipstream pools.
                </p>
            </motion.div>

            {/* Swap Interface */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <SwapInterface />
            </motion.div>

            {/* Info Section */}
            <motion.div
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">⚡</div>
                    <h3 className="font-semibold mb-2">Fastest Execution</h3>
                    <p className="text-sm text-gray-400">
                        Sub-second finality on Sei Network
                    </p>
                </div>

                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">💎</div>
                    <h3 className="font-semibold mb-2">Best Rates</h3>
                    <p className="text-sm text-gray-400">
                        Deep liquidity from V2 and CL pools
                    </p>
                </div>

                <div className="glass-card p-6 text-center">
                    <div className="text-3xl mb-3">🔒</div>
                    <h3 className="font-semibold mb-2">Secure & Audited</h3>
                    <p className="text-sm text-gray-400">
                        Battle-tested contracts on Sei
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
