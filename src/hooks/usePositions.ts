'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Address, formatUnits, parseUnits } from 'viem';
import { CL_CONTRACTS, V2_CONTRACTS } from '@/config/contracts';
import { NFT_POSITION_MANAGER_ABI, ERC20_ABI, POOL_FACTORY_ABI, POOL_ABI } from '@/config/abis';
import { useState, useEffect, useCallback } from 'react';

export interface CLPosition {
    tokenId: bigint;
    poolId: Address;
    token0: Address;
    token1: Address;
    token0Decimals: number;
    token1Decimals: number;
    token0PriceUSD: number;
    token1PriceUSD: number;
    tickSpacing: number;
    tickLower: number;
    tickUpper: number;
    currentTick: number;  // Pool's current tick from subgraph
    liquidity: bigint;
    tokensOwed0: bigint;
    tokensOwed1: bigint;
    amountUSD: number;
    depositedToken0: number;
    depositedToken1: number;
    withdrawnToken0: number;
    withdrawnToken1: number;
    collectedToken0: number;
    collectedToken1: number;
    token0Symbol?: string;
    token1Symbol?: string;
}

export interface V2Position {
    poolAddress: Address;
    token0: Address;
    token1: Address;
    stable: boolean;
    lpBalance: bigint;
}

// ============================================
// SUBGRAPH-BASED POSITION FETCHING
// All position data comes from subgraph - no RPC fallback
// ============================================

import { useUserPositions, SubgraphPosition } from './useSubgraph';

/**
 * Primary hook for fetching CL positions from subgraph
 * Returns positions with tokensOwed from subgraph data
 */
export function useCLPositionsFromSubgraph() {
    const { address } = useAccount();
    const { positions: subgraphPositions, isLoading, error, refetch } = useUserPositions(address);

    // Convert subgraph positions to CLPosition format
    const positions: CLPosition[] = subgraphPositions
        .map((p: SubgraphPosition) => ({
            tokenId: BigInt(p.tokenId),
            poolId: p.pool.id as Address,
            token0: p.pool.token0.id as Address,
            token1: p.pool.token1.id as Address,
            token0Decimals: Number(p.pool.token0.decimals ?? 18),
            token1Decimals: Number(p.pool.token1.decimals ?? 18),
            token0PriceUSD: p.pool.token0.priceUSD ? parseFloat(p.pool.token0.priceUSD) : 0,
            token1PriceUSD: p.pool.token1.priceUSD ? parseFloat(p.pool.token1.priceUSD) : 0,
            tickSpacing: p.pool.tickSpacing,
            tickLower: p.tickLower,
            tickUpper: p.tickUpper,
            currentTick: p.pool.tick ?? 0,  // Pool's current tick from subgraph
            liquidity: BigInt(p.liquidity),
            // Use tokensOwed from subgraph (snapshot from last interaction)
            tokensOwed0: p.tokensOwed0 ? parseUnits(p.tokensOwed0, Number(p.pool.token0.decimals ?? 18)) : BigInt(0),
            tokensOwed1: p.tokensOwed1 ? parseUnits(p.tokensOwed1, Number(p.pool.token1.decimals ?? 18)) : BigInt(0),
            amountUSD: p.amountUSD ? parseFloat(p.amountUSD) : 0,
            depositedToken0: p.depositedToken0 ? parseFloat(p.depositedToken0) : 0,
            depositedToken1: p.depositedToken1 ? parseFloat(p.depositedToken1) : 0,
            withdrawnToken0: p.withdrawnToken0 ? parseFloat(p.withdrawnToken0) : 0,
            withdrawnToken1: p.withdrawnToken1 ? parseFloat(p.withdrawnToken1) : 0,
            collectedToken0: p.collectedToken0 ? parseFloat(p.collectedToken0) : 0,
            collectedToken1: p.collectedToken1 ? parseFloat(p.collectedToken1) : 0,
            token0Symbol: p.pool.token0.symbol,
            token1Symbol: p.pool.token1.symbol,
        }))
        // Show positions with liquidity > 0 OR uncollected tokens
        .filter(p => p.liquidity > BigInt(0) || p.tokensOwed0 > BigInt(0) || p.tokensOwed1 > BigInt(0));

    return {
        positions,
        positionCount: positions.length,
        isLoading,
        error,
        refetch,
    };
}

// Alias for backwards compatibility - useCLPositions now uses subgraph
export const useCLPositions = useCLPositionsFromSubgraph;

// Hook to fetch V2 LP token balances
export function useV2Positions() {
    const { address } = useAccount();

    // Get all pools count
    const { data: poolCount } = useReadContract({
        address: V2_CONTRACTS.PoolFactory as Address,
        abi: POOL_FACTORY_ABI,
        functionName: 'allPoolsLength',
    });

    const totalPools = poolCount ? Math.min(Number(poolCount), 20) : 0;

    // Get pool addresses - using individual reads to avoid the never[] type issue
    const { data: pool0 } = useReadContract({
        address: V2_CONTRACTS.PoolFactory as Address,
        abi: POOL_FACTORY_ABI,
        functionName: 'allPools',
        args: [BigInt(0)],
        query: { enabled: totalPools > 0 },
    });

    const { data: pool1 } = useReadContract({
        address: V2_CONTRACTS.PoolFactory as Address,
        abi: POOL_FACTORY_ABI,
        functionName: 'allPools',
        args: [BigInt(1)],
        query: { enabled: totalPools > 1 },
    });

    const { data: pool2 } = useReadContract({
        address: V2_CONTRACTS.PoolFactory as Address,
        abi: POOL_FACTORY_ABI,
        functionName: 'allPools',
        args: [BigInt(2)],
        query: { enabled: totalPools > 2 },
    });

    const poolAddresses = [pool0, pool1, pool2].filter(Boolean) as Address[];

    // Get LP balances for first pool
    const { data: balance0, refetch: refetch0 } = useReadContract({
        address: pool0 as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!pool0 },
    });

    const { data: balance1 } = useReadContract({
        address: pool1 as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!pool1 },
    });

    const { data: balance2 } = useReadContract({
        address: pool2 as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!pool2 },
    });

    // Get pool details for pools with balance
    const { data: pool0Token0 } = useReadContract({
        address: pool0 as Address,
        abi: POOL_ABI,
        functionName: 'token0',
        query: { enabled: !!pool0 && !!balance0 && balance0 > BigInt(0) },
    });

    const { data: pool0Token1 } = useReadContract({
        address: pool0 as Address,
        abi: POOL_ABI,
        functionName: 'token1',
        query: { enabled: !!pool0 && !!balance0 && balance0 > BigInt(0) },
    });

    const { data: pool0Stable } = useReadContract({
        address: pool0 as Address,
        abi: POOL_ABI,
        functionName: 'stable',
        query: { enabled: !!pool0 && !!balance0 && balance0 > BigInt(0) },
    });

    // Build positions array
    const v2Positions: V2Position[] = [];

    if (pool0 && balance0 && balance0 > BigInt(0) && pool0Token0 && pool0Token1) {
        v2Positions.push({
            poolAddress: pool0 as Address,
            token0: pool0Token0 as Address,
            token1: pool0Token1 as Address,
            stable: !!pool0Stable,
            lpBalance: balance0 as bigint,
        });
    }

    if (pool1 && balance1 && balance1 > BigInt(0)) {
        v2Positions.push({
            poolAddress: pool1 as Address,
            token0: '0x0000000000000000000000000000000000000000' as Address,
            token1: '0x0000000000000000000000000000000000000000' as Address,
            stable: false,
            lpBalance: balance1 as bigint,
        });
    }

    if (pool2 && balance2 && balance2 > BigInt(0)) {
        v2Positions.push({
            poolAddress: pool2 as Address,
            token0: '0x0000000000000000000000000000000000000000' as Address,
            token1: '0x0000000000000000000000000000000000000000' as Address,
            stable: false,
            lpBalance: balance2 as bigint,
        });
    }

    const refetch = () => {
        refetch0();
    };

    return {
        positions: v2Positions,
        totalPools,
        refetch,
    };
}
