'use client';

import { useState, useCallback } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { useWriteContract } from '@/hooks/useWriteContract';
import { usePoolData } from '@/providers/PoolDataProvider';
import { MIGRATION_CONTRACTS, V2_CONTRACTS } from '@/config/contracts';
import { sei } from '@/config/chains';

const SENDER_ADDRESS = MIGRATION_CONTRACTS.Sender as `0x${string}`;
const VE_ADDRESS = V2_CONTRACTS.VotingEscrow as `0x${string}`;
const VOTER_ADDRESS = V2_CONTRACTS.Voter as `0x${string}`;
const SEI_CHAIN_ID = sei.id;

const SENDER_ABI = [
    {
        name: 'quoteMigrate',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        outputs: [{ name: 'fee', type: 'uint256' }],
    },
    {
        name: 'migrate',
        type: 'function',
        stateMutability: 'payable',
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'migrated',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'migrationOpen',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

const VE_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_approved', type: 'address' },
            { name: '_tokenId', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'getApproved',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'voted',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

const VOTER_ABI = [
    {
        name: 'reset',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_tokenId', type: 'uint256' }],
        outputs: [],
    },
] as const;

export function useMigration() {
    const { address } = useAccount();
    const { veNFTs, veNFTsLoading, refetchVeNFTs } = usePoolData();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient({ chainId: SEI_CHAIN_ID });

    const [migratingTokenId, setMigratingTokenId] = useState<bigint | null>(null);
    const [migrateStep, setMigrateStep] = useState<'reset' | 'approve' | 'migrate' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: migrationOpen } = useReadContract({
        address: SENDER_ADDRESS,
        abi: SENDER_ABI,
        functionName: 'migrationOpen',
        chainId: SEI_CHAIN_ID,
    });

    const quoteFee = useCallback(async (tokenId: bigint): Promise<bigint> => {
        if (!publicClient) return 0n;
        const fee = await publicClient.readContract({
            address: SENDER_ADDRESS,
            abi: SENDER_ABI,
            functionName: 'quoteMigrate',
            args: [tokenId],
        });
        return fee as bigint;
    }, [publicClient]);

    const isMigrated = useCallback(async (tokenId: bigint): Promise<boolean> => {
        if (!publicClient) return false;
        const result = await publicClient.readContract({
            address: SENDER_ADDRESS,
            abi: SENDER_ABI,
            functionName: 'migrated',
            args: [tokenId],
        });
        return result as boolean;
    }, [publicClient]);

    const migrate = useCallback(async (tokenId: bigint): Promise<string | null> => {
        if (!address) {
            setError('Wallet not connected');
            return null;
        }
        setError(null);
        setMigratingTokenId(tokenId);

        try {
            // Step 1: Reset votes if the veNFT has voted this epoch
            const hasVoted = await publicClient!.readContract({
                address: VE_ADDRESS,
                abi: VE_ABI,
                functionName: 'voted',
                args: [tokenId],
            }) as boolean;

            if (hasVoted) {
                setMigrateStep('reset');
                const resetTx = await writeContractAsync({
                    address: VOTER_ADDRESS,
                    abi: VOTER_ABI,
                    functionName: 'reset',
                    args: [tokenId],
                });
                await publicClient!.waitForTransactionReceipt({ hash: resetTx });
            }

            // Step 2: Check if already approved
            const approved = await publicClient!.readContract({
                address: VE_ADDRESS,
                abi: VE_ABI,
                functionName: 'getApproved',
                args: [tokenId],
            }) as string;

            if (approved.toLowerCase() !== SENDER_ADDRESS.toLowerCase()) {
                setMigrateStep('approve');
                const approveTx = await writeContractAsync({
                    address: VE_ADDRESS,
                    abi: VE_ABI,
                    functionName: 'approve',
                    args: [SENDER_ADDRESS, tokenId],
                });
                await publicClient!.waitForTransactionReceipt({ hash: approveTx });
            }

            // Step 3: Quote fee and migrate
            setMigrateStep('migrate');
            const fee = await quoteFee(tokenId);

            const migrateTx = await writeContractAsync({
                address: SENDER_ADDRESS,
                abi: SENDER_ABI,
                functionName: 'migrate',
                args: [tokenId],
                value: fee,
            });

            await publicClient!.waitForTransactionReceipt({ hash: migrateTx });
            await refetchVeNFTs();
            return migrateTx;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Migration failed';
            setError(msg.includes('user rejected') ? 'Transaction rejected' : msg.split('(')[0].trim());
            return null;
        } finally {
            setMigratingTokenId(null);
            setMigrateStep(null);
        }
    }, [address, publicClient, writeContractAsync, quoteFee, refetchVeNFTs]);

    return {
        veNFTs,
        veNFTsLoading,
        migrationOpen: migrationOpen ?? false,
        migratingTokenId,
        migrateStep,
        error,
        migrate,
        quoteFee,
        isMigrated,
    };
}
