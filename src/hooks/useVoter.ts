'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract } from '@/hooks/useWriteContract';
import { Address, parseUnits } from 'viem';
import { V2_CONTRACTS } from '@/config/contracts';
import { usePoolData, GaugeInfo, RewardToken } from '@/providers/PoolDataProvider';
import { VOTER_EXTENDED_ABI, BRIBE_VOTING_REWARD_ABI, ERC20_ABI } from '@/config/abis';
import { SUBGRAPH_URL } from '@/hooks/useSubgraph';

// Re-export types for backward compatibility
export type { GaugeInfo, RewardToken };

// Voter ABI (only what we need for write operations)
const VOTER_ABI = [
    {
        inputs: [
            { name: '_tokenId', type: 'uint256' },
            { name: '_poolVote', type: 'address[]' },
            { name: '_weights', type: 'uint256[]' },
        ],
        name: 'vote',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        name: 'reset',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

export interface VoteInfo {
    pool: string;
    weight: bigint;
}

export function useVoter() {
    const { address, isConnected } = useAccount();
    const [error, setError] = useState<string | null>(null);
    const [existingVotes, setExistingVotes] = useState<Record<string, bigint>>({});

    const { writeContractAsync } = useWriteContract();

    // Get gauge data from global provider (instant!)
    const { gauges, totalVoteWeight, epochCount, gaugesLoading, refetch } = usePoolData();

    const fetchGraphQL = useCallback(async <T,>(query: string, variables: Record<string, any>): Promise<T> => {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        const json = await response.json();
        if (json.errors) {
            throw new Error(json.errors[0]?.message || 'Subgraph error');
        }
        return json.data;
    }, []);

    // Fetch existing votes for a veNFT across all pools
    const fetchExistingVotes = useCallback(async (tokenId: bigint) => {
        if (!tokenId) return;
        if (epochCount === BigInt(0)) return;

        try {
            const query = `query ExistingVotes($tokenId: ID!, $epoch: BigInt!) {
                veVotes(where: { veNFT: $tokenId, epoch: $epoch, isActive: true }, first: 500) {
                    pool { id }
                    weight
                }
            }`;

            const data = await fetchGraphQL<{ veVotes: Array<{ pool: { id: string }; weight: string }> }>(query, {
                tokenId: tokenId.toString(),
                epoch: epochCount.toString(),
            });

            const votesMap: Record<string, bigint> = {};
            for (const v of data.veVotes || []) {
                const poolId = String(v.pool?.id || '').toLowerCase();
                if (!poolId) continue;
                const w = v.weight ? BigInt(v.weight) : BigInt(0);
                if (w > BigInt(0)) votesMap[poolId] = w;
            }
            setExistingVotes(votesMap);
        } catch (err) {
            console.error('Error fetching existing votes (subgraph):', err);
        }
    }, [epochCount, fetchGraphQL]);

    // Add incentive (bribe) to a pool
    const addIncentive = useCallback(async (
        poolAddress: string,
        tokenAddress: string,
        amount: string,
        tokenDecimals: number
    ) => {
        setError(null);
        try {
            const gauge = gauges.find(g => g.pool.toLowerCase() === poolAddress.toLowerCase());
            const bribeAddress = gauge?.bribeReward;
            if (!bribeAddress) {
                throw new Error('No bribe contract found for this gauge');
            }

            const amountWei = parseUnits(amount, tokenDecimals);

            // First approve the bribe contract to spend tokens
            await writeContractAsync({
                address: tokenAddress as Address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [bribeAddress as Address, amountWei],
            });

            // Then add the incentive
            const hash = await writeContractAsync({
                address: bribeAddress as Address,
                abi: BRIBE_VOTING_REWARD_ABI,
                functionName: 'notifyRewardAmount',
                args: [tokenAddress as Address, amountWei],
            });

            // Refetch gauge data
            await refetch();

            return { hash };
        } catch (err: any) {
            setError(err.message || 'Failed to add incentive');
            return null;
        }
    }, [gauges, writeContractAsync, refetch]);

    // Vote function
    const vote = async (tokenId: bigint, poolVotes: { pool: Address; weight: number }[]) => {
        if (!address || poolVotes.length === 0) return;

        setError(null);
        try {
            const pools = poolVotes.map(v => v.pool);
            const weights = poolVotes.map(v => BigInt(v.weight));

            const hash = await writeContractAsync({
                address: V2_CONTRACTS.Voter as Address,
                abi: VOTER_ABI,
                functionName: 'vote',
                args: [tokenId, pools, weights],
            });

            // Refetch global data after voting
            await refetch();
            // Refetch existing votes
            await fetchExistingVotes(tokenId);

            return { hash };
        } catch (err: any) {
            setError(err.message || 'Vote failed');
            return null;
        }
    };

    // Reset votes
    const resetVotes = async (tokenId: bigint) => {
        if (!address) return;

        setError(null);
        try {
            const hash = await writeContractAsync({
                address: V2_CONTRACTS.Voter as Address,
                abi: VOTER_ABI,
                functionName: 'reset',
                args: [tokenId],
            });

            // Refetch global data after reset
            await refetch();
            // Clear existing votes
            setExistingVotes({});

            return { hash };
        } catch (err: any) {
            setError(err.message || 'Reset failed');
            return null;
        }
    };

    return {
        gauges,
        totalWeight: totalVoteWeight,
        poolCount: gauges.length,
        isLoading: gaugesLoading,
        error,
        vote,
        resetVotes,
        refetch,
        // New functions
        existingVotes,
        fetchExistingVotes,
        addIncentive,
    };
}

