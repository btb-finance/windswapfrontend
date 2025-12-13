'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Token, SEI, USDC } from '@/config/tokens';
import { TokenInput } from './TokenInput';
import { SwapSettings } from './SwapSettings';

export function SwapInterface() {
    const { isConnected } = useAccount();

    // Token state
    const [tokenIn, setTokenIn] = useState<Token | undefined>(SEI);
    const [tokenOut, setTokenOut] = useState<Token | undefined>(USDC);
    const [amountIn, setAmountIn] = useState('');
    const [amountOut, setAmountOut] = useState('');

    // Settings state
    const [slippage, setSlippage] = useState(0.5);
    const [deadline, setDeadline] = useState(30);

    // UI state
    const [isLoading, setIsLoading] = useState(false);

    // Swap tokens
    const handleSwapTokens = useCallback(() => {
        setTokenIn(tokenOut);
        setTokenOut(tokenIn);
        setAmountIn(amountOut);
        setAmountOut(amountIn);
    }, [tokenIn, tokenOut, amountIn, amountOut]);

    // Handle amount changes
    const handleAmountInChange = (amount: string) => {
        setAmountIn(amount);
        // TODO: Fetch quote from QuoterV2 or Router
        if (amount && parseFloat(amount) > 0) {
            // Simulated quote - in production, this would call the contract
            const simulatedOut = (parseFloat(amount) * 0.95).toFixed(6);
            setAmountOut(simulatedOut);
        } else {
            setAmountOut('');
        }
    };

    // Check if swap is valid
    const canSwap = isConnected &&
        tokenIn &&
        tokenOut &&
        amountIn &&
        parseFloat(amountIn) > 0;

    // Calculate price impact (placeholder)
    const priceImpact = amountIn && amountOut ? '< 0.01%' : '--';

    // Calculate rate
    const rate = amountIn && amountOut && parseFloat(amountIn) > 0
        ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)
        : null;

    const handleSwap = async () => {
        if (!canSwap) return;

        setIsLoading(true);
        try {
            // TODO: Execute swap transaction
            console.log('Executing swap...', {
                tokenIn: tokenIn?.symbol,
                tokenOut: tokenOut?.symbol,
                amountIn,
                amountOut,
                slippage,
                deadline,
            });

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Reset amounts
            setAmountIn('');
            setAmountOut('');
        } catch (error) {
            console.error('Swap failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="swap-card max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Swap</h2>
                <SwapSettings
                    slippage={slippage}
                    deadline={deadline}
                    onSlippageChange={setSlippage}
                    onDeadlineChange={setDeadline}
                />
            </div>

            {/* Input Token */}
            <TokenInput
                label="You Pay"
                token={tokenIn}
                amount={amountIn}
                onAmountChange={handleAmountInChange}
                onTokenSelect={setTokenIn}
                excludeToken={tokenOut}
                showMaxButton={true}
            />

            {/* Swap Direction Button */}
            <div className="flex justify-center -my-2 relative z-10">
                <motion.button
                    onClick={handleSwapTokens}
                    className="p-3 rounded-xl bg-bg-secondary border border-glass-border hover:bg-white/5 transition group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-white transition transform group-hover:rotate-180 duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                    </svg>
                </motion.button>
            </div>

            {/* Output Token */}
            <TokenInput
                label="You Receive"
                token={tokenOut}
                amount={amountOut}
                onAmountChange={setAmountOut}
                onTokenSelect={setTokenOut}
                excludeToken={tokenIn}
                disabled={true}
            />

            {/* Rate Display */}
            {rate && tokenIn && tokenOut && (
                <div className="mt-4 p-3 rounded-xl bg-white/5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Rate</span>
                        <span>
                            1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Price Impact</span>
                        <span className={parseFloat(priceImpact) > 3 ? 'text-warning' : 'text-green-400'}>
                            {priceImpact}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Slippage</span>
                        <span>{slippage}%</span>
                    </div>
                </div>
            )}

            {/* Swap Button */}
            <motion.button
                onClick={handleSwap}
                disabled={!canSwap || isLoading}
                className="w-full btn-primary mt-6 py-4 text-lg"
                whileHover={canSwap && !isLoading ? { scale: 1.01 } : {}}
                whileTap={canSwap && !isLoading ? { scale: 0.99 } : {}}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Swapping...
                    </span>
                ) : !isConnected ? (
                    'Connect Wallet'
                ) : !tokenIn || !tokenOut ? (
                    'Select Tokens'
                ) : !amountIn || parseFloat(amountIn) <= 0 ? (
                    'Enter Amount'
                ) : (
                    `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`
                )}
            </motion.button>

            {/* Powered by */}
            <div className="mt-4 text-center text-xs text-gray-500">
                Powered by YAKA Router & Slipstream
            </div>
        </div>
    );
}
