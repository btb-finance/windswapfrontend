'use client';

import { useState, useCallback } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { Token, WSEI, USDC } from '@/config/tokens';
import { CL_CONTRACTS } from '@/config/contracts';

// Common intermediate tokens for routing
const INTERMEDIATE_TOKENS = [WSEI, USDC];

// Most used tick spacings
const TICK_SPACINGS = [10, 80] as const;

interface RouteQuote {
    amountOut: string;
    path: string[];
    routeType: 'direct' | 'multi-hop';
    via?: string;
    intermediate?: Token;
    gasEstimate?: bigint;
    tickSpacing1?: number;
    tickSpacing2?: number;
}

export function useMixedRouteQuoter() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Single-call quote using MixedRouteQuoterV1.quoteExactInput
    const quoteWithPath = useCallback(async (
        path: `0x${string}`,
        amountIn: bigint,
        outputDecimals: number
    ): Promise<{ amountOut: bigint; gasEstimate: bigint } | null> => {
        try {
            // Encode quoteExactInput(bytes path, uint256 amountIn)
            // Function selector: cdca1753
            const selector = 'cdca1753';

            // Encode dynamic bytes (path) - offset + length + data
            const pathHex = path.slice(2);
            const pathOffset = '0000000000000000000000000000000000000000000000000000000000000040'; // offset = 64
            const amountInHex = amountIn.toString(16).padStart(64, '0');
            const pathLength = (pathHex.length / 2).toString(16).padStart(64, '0');
            const pathPadded = pathHex.padEnd(Math.ceil(pathHex.length / 64) * 64, '0');

            const data = `0x${selector}${pathOffset}${amountInHex}${pathLength}${pathPadded}`;

            const response = await fetch('https://evm-rpc.sei-apis.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: CL_CONTRACTS.MixedRouteQuoterV1, data }, 'latest'],
                    id: 1
                })
            });

            const result = await response.json();

            if (result.result && result.result !== '0x' && result.result.length > 66) {
                const hex = result.result.slice(2);
                const amountOut = BigInt('0x' + hex.slice(0, 64));
                // Gas estimate is later in the response
                const gasEstimate = hex.length >= 512 ? BigInt('0x' + hex.slice(448, 512)) : BigInt(0);
                return { amountOut, gasEstimate };
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Encode path for V3: token + tickSpacing (3 bytes) + token
    const encodePath = (tokens: string[], tickSpacings: number[]): `0x${string}` => {
        let path = tokens[0].slice(2).toLowerCase();
        for (let i = 0; i < tickSpacings.length; i++) {
            // Encode tick spacing as signed int24 (3 bytes)
            const ts = tickSpacings[i];
            const tsHex = ts >= 0
                ? ts.toString(16).padStart(6, '0')
                : ((1 << 24) + ts).toString(16);
            path += tsHex + tokens[i + 1].slice(2).toLowerCase();
        }
        return `0x${path}` as `0x${string}`;
    };

    // Quote direct route (single call per tick spacing, all in parallel)
    const quoteDirectV3 = useCallback(async (
        tokenIn: Token,
        tokenOut: Token,
        amountIn: string
    ): Promise<RouteQuote | null> => {
        const actualTokenIn = tokenIn.isNative ? WSEI : tokenIn;
        const actualTokenOut = tokenOut.isNative ? WSEI : tokenOut;

        if (!amountIn || parseFloat(amountIn) <= 0) return null;

        const amountInWei = parseUnits(amountIn, actualTokenIn.decimals);

        // Try all tick spacings in parallel
        const promises = TICK_SPACINGS.map(async (ts) => {
            const path = encodePath([actualTokenIn.address, actualTokenOut.address], [ts]);
            const result = await quoteWithPath(path, amountInWei, actualTokenOut.decimals);
            return result ? { ...result, tickSpacing: ts } : null;
        });

        const results = await Promise.all(promises);
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null && r.amountOut > BigInt(0));

        if (valid.length === 0) return null;

        // Pick best
        const best = valid.reduce((a, b) => a.amountOut > b.amountOut ? a : b);
        return {
            amountOut: formatUnits(best.amountOut, actualTokenOut.decimals),
            path: [tokenIn.symbol, tokenOut.symbol],
            routeType: 'direct',
            gasEstimate: best.gasEstimate,
            tickSpacing1: best.tickSpacing,
        };
    }, [quoteWithPath]);

    // Quote multi-hop route (SINGLE call for entire path!)
    const quoteMultiHopV3 = useCallback(async (
        tokenIn: Token,
        tokenOut: Token,
        amountIn: string,
        intermediate: Token
    ): Promise<RouteQuote | null> => {
        const actualTokenIn = tokenIn.isNative ? WSEI : tokenIn;
        const actualTokenOut = tokenOut.isNative ? WSEI : tokenOut;
        const actualIntermediate = intermediate.isNative ? WSEI : intermediate;

        // Skip if intermediate same as input/output
        if (actualIntermediate.address.toLowerCase() === actualTokenIn.address.toLowerCase() ||
            actualIntermediate.address.toLowerCase() === actualTokenOut.address.toLowerCase()) {
            return null;
        }

        if (!amountIn || parseFloat(amountIn) <= 0) return null;

        const amountInWei = parseUnits(amountIn, actualTokenIn.decimals);

        // Try all combinations of tick spacings in parallel (2x2 = 4 combinations)
        const promises: Promise<{ amountOut: bigint; gasEstimate: bigint; ts1: number; ts2: number } | null>[] = [];

        for (const ts1 of TICK_SPACINGS) {
            for (const ts2 of TICK_SPACINGS) {
                const path = encodePath(
                    [actualTokenIn.address, actualIntermediate.address, actualTokenOut.address],
                    [ts1, ts2]
                );
                promises.push(
                    quoteWithPath(path, amountInWei, actualTokenOut.decimals)
                        .then(r => r ? { ...r, ts1, ts2 } : null)
                );
            }
        }

        const results = await Promise.all(promises);
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null && r.amountOut > BigInt(0));

        if (valid.length === 0) return null;

        const best = valid.reduce((a, b) => a.amountOut > b.amountOut ? a : b);
        return {
            amountOut: formatUnits(best.amountOut, actualTokenOut.decimals),
            path: [tokenIn.symbol, intermediate.symbol, tokenOut.symbol],
            routeType: 'multi-hop',
            via: intermediate.symbol,
            intermediate,
            gasEstimate: best.gasEstimate,
            tickSpacing1: best.ts1,
            tickSpacing2: best.ts2,
        };
    }, [quoteWithPath]);

    // Find the best route (all routes in parallel)
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
            // All routes in parallel - direct + multi-hop via each intermediate
            const [directQuote, ...multiHopQuotes] = await Promise.all([
                quoteDirectV3(tokenIn, tokenOut, amountIn),
                ...INTERMEDIATE_TOKENS.map(intermediate =>
                    quoteMultiHopV3(tokenIn, tokenOut, amountIn, intermediate)
                )
            ]);

            const quotes: RouteQuote[] = [];
            if (directQuote) quotes.push(directQuote);
            multiHopQuotes.forEach(q => { if (q) quotes.push(q); });

            if (quotes.length === 0) {
                setIsLoading(false);
                return null;
            }

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

    const getIntermediateToken = useCallback((symbol: string): Token | undefined => {
        return INTERMEDIATE_TOKENS.find(t => t.symbol === symbol);
    }, []);

    return {
        findBestRoute,
        getIntermediateToken,
        INTERMEDIATE_TOKENS,
        isLoading,
        error,
    };
}
