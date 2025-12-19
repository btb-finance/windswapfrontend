'use client';

import { useState, useCallback } from 'react';
import { parseUnits, formatUnits, Address, encodePacked, encodeAbiParameters, parseAbiParameters } from 'viem';
import { Token, WSEI, USDC, SEI } from '@/config/tokens';
import { CL_CONTRACTS, V2_CONTRACTS } from '@/config/contracts';

// Common intermediate tokens for routing
const INTERMEDIATE_TOKENS = [
    WSEI,
    USDC,
];

// Tick spacings to try for CL pools
const TICK_SPACINGS = [1, 50, 100, 200, 2000] as const;

interface RouteQuote {
    amountOut: string;
    path: string[];  // Token symbols for display
    routeType: 'direct' | 'multi-hop';
    via?: string;    // Intermediate token if multi-hop
    gasEstimate?: bigint;
}

export function useMixedRouteQuoter() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Quote a direct V3 swap
    const quoteDirectV3 = useCallback(async (
        tokenIn: Token,
        tokenOut: Token,
        amountIn: string
    ): Promise<RouteQuote | null> => {
        const actualTokenIn = tokenIn.isNative ? WSEI : tokenIn;
        const actualTokenOut = tokenOut.isNative ? WSEI : tokenOut;

        if (!amountIn || parseFloat(amountIn) <= 0) return null;

        try {
            const amountInWei = parseUnits(amountIn, actualTokenIn.decimals);

            // Try all tick spacings and find best
            for (const tickSpacing of TICK_SPACINGS) {
                const result = await callQuoterV3Single(
                    actualTokenIn.address,
                    actualTokenOut.address,
                    amountInWei,
                    tickSpacing
                );

                if (result && result.amountOut > BigInt(0)) {
                    return {
                        amountOut: formatUnits(result.amountOut, actualTokenOut.decimals),
                        path: [tokenIn.symbol, tokenOut.symbol],
                        routeType: 'direct',
                        gasEstimate: result.gasEstimate,
                    };
                }
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Quote a multi-hop V3 swap through intermediate token
    const quoteMultiHopV3 = useCallback(async (
        tokenIn: Token,
        tokenOut: Token,
        amountIn: string,
        intermediate: Token
    ): Promise<RouteQuote | null> => {
        const actualTokenIn = tokenIn.isNative ? WSEI : tokenIn;
        const actualTokenOut = tokenOut.isNative ? WSEI : tokenOut;
        const actualIntermediate = intermediate.isNative ? WSEI : intermediate;

        // Skip if intermediate is same as input or output
        if (actualIntermediate.address.toLowerCase() === actualTokenIn.address.toLowerCase() ||
            actualIntermediate.address.toLowerCase() === actualTokenOut.address.toLowerCase()) {
            return null;
        }

        if (!amountIn || parseFloat(amountIn) <= 0) return null;

        try {
            const amountInWei = parseUnits(amountIn, actualTokenIn.decimals);

            // First leg: tokenIn -> intermediate
            let firstLegOut: bigint | null = null;
            for (const tickSpacing of TICK_SPACINGS) {
                const result = await callQuoterV3Single(
                    actualTokenIn.address,
                    actualIntermediate.address,
                    amountInWei,
                    tickSpacing
                );
                if (result && result.amountOut > BigInt(0)) {
                    firstLegOut = result.amountOut;
                    break;
                }
            }

            if (!firstLegOut) return null;

            // Second leg: intermediate -> tokenOut
            for (const tickSpacing of TICK_SPACINGS) {
                const result = await callQuoterV3Single(
                    actualIntermediate.address,
                    actualTokenOut.address,
                    firstLegOut,
                    tickSpacing
                );
                if (result && result.amountOut > BigInt(0)) {
                    return {
                        amountOut: formatUnits(result.amountOut, actualTokenOut.decimals),
                        path: [tokenIn.symbol, intermediate.symbol, tokenOut.symbol],
                        routeType: 'multi-hop',
                        via: intermediate.symbol,
                        gasEstimate: result.gasEstimate,
                    };
                }
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Find the best route (direct or multi-hop)
    const findBestRoute = useCallback(async (
        tokenIn: Token,
        tokenOut: Token,
        amountIn: string
    ): Promise<RouteQuote | null> => {
        if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const quotes: RouteQuote[] = [];

            // Try direct route
            const directQuote = await quoteDirectV3(tokenIn, tokenOut, amountIn);
            if (directQuote) {
                quotes.push(directQuote);
            }

            // Try multi-hop routes through intermediates
            for (const intermediate of INTERMEDIATE_TOKENS) {
                const multiHopQuote = await quoteMultiHopV3(tokenIn, tokenOut, amountIn, intermediate);
                if (multiHopQuote) {
                    quotes.push(multiHopQuote);
                }
            }

            if (quotes.length === 0) {
                setIsLoading(false);
                return null;
            }

            // Find best quote (highest amountOut)
            const best = quotes.reduce((a, b) =>
                parseFloat(a.amountOut) > parseFloat(b.amountOut) ? a : b
            );

            setIsLoading(false);
            return best;
        } catch (err: any) {
            setError(err.message || 'Quote failed');
            setIsLoading(false);
            return null;
        }
    }, [quoteDirectV3, quoteMultiHopV3]);

    return {
        findBestRoute,
        isLoading,
        error,
    };
}

// Helper: Call QuoterV2.quoteExactInputSingle for V3
async function callQuoterV3Single(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    tickSpacing: number
): Promise<{ amountOut: bigint; gasEstimate: bigint } | null> {
    try {
        // Encode QuoterV2.quoteExactInputSingle call
        // Function selector: 0x9e7defe6
        const selector = '9e7defe6';
        const tokenInPadded = tokenIn.slice(2).padStart(64, '0');
        const tokenOutPadded = tokenOut.slice(2).padStart(64, '0');
        const amountInHex = amountIn.toString(16).padStart(64, '0');
        const tickHex = tickSpacing >= 0
            ? tickSpacing.toString(16).padStart(64, '0')
            : (BigInt(2) ** BigInt(256) + BigInt(tickSpacing)).toString(16);
        const sqrtPriceLimitHex = '0'.padStart(64, '0');

        const data = `0x${selector}${tokenInPadded}${tokenOutPadded}${amountInHex}${tickHex}${sqrtPriceLimitHex}`;

        const response = await fetch('https://evm-rpc.sei-apis.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: CL_CONTRACTS.QuoterV2, data }, 'latest'],
                id: 1
            })
        });

        const result = await response.json();

        if (result.result && result.result !== '0x' && result.result.length > 2) {
            const hex = result.result.slice(2);
            const amountOut = BigInt('0x' + hex.slice(0, 64));
            const gasEstimate = hex.length >= 256 ? BigInt('0x' + hex.slice(192, 256)) : BigInt(0);
            return { amountOut, gasEstimate };
        }
        return null;
    } catch {
        return null;
    }
}
