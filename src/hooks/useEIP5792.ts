'use client';

import { useCallback } from 'react';
import { Address } from 'viem';
import { useBatchTransactions } from '@/hooks/useBatchTransactions';

// ==========================================
// EIP-5792: Wallet Send Calls
// Support for smart wallets with batch transaction capabilities
// ==========================================
export function useEIP5792() {
    const batch = useBatchTransactions();

    const sendCalls = useCallback(async (
        calls: Array<{
            to: Address;
            data?: `0x${string}`;
            value?: bigint;
        }>
    ) => {
        return batch.executeBatch(calls);
    }, [batch]);

    const isEIP5792Supported = useCallback(() => {
        // Check if wallet supports EIP-5792
        // Supported by MetaMask with Smart Accounts and other modern smart contract wallets
        return typeof window !== 'undefined' &&
               (window as any).ethereum?.isMetaMask;
    }, []);

    return {
        sendCalls,
        isEIP5792Supported,
        batch,
    };
}
