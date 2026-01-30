'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSafeAppsSDK } from '@/hooks/useWalletProviders';

// ==========================================
// Safe App Integration Component
// Auto-detects Safe context and adapts UI accordingly
// ==========================================
export function SafeIntegration() {
    const { safeSDK, safeInfo, isSafeApp, getSafeBalances, submitSafeTransaction } = useSafeAppsSDK();
    const [balances, setBalances] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isSafeApp) {
            fetchSafeBalances();
        }
    }, [isSafeApp]);

    const fetchSafeBalances = useCallback(async () => {
        setIsLoading(true);
        const safeBalances = await getSafeBalances();
        if (safeBalances) {
            setBalances(safeBalances.items || []);
        }
        setIsLoading(false);
    }, [getSafeBalances]);

    if (!isSafeApp) {
        return null;
    }

    return (
        <div className="safe-integration p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-300">
                    Safe App Detected
                </span>
            </div>
            
            {safeInfo && (
                <div className="text-xs text-gray-400 mb-3">
                    <p>Safe Address: {safeInfo.safeAddress}</p>
                    <p>Chain: {safeInfo.chainId}</p>
                </div>
            )}

            {balances.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Safe Balances:</p>
                    <div className="space-y-1">
                        {balances.slice(0, 3).map((balance, idx) => (
                            <div key={idx} className="text-xs text-gray-400 flex justify-between">
                                <span>{balance.tokenInfo?.symbol || 'ETH'}</span>
                                <span>{(parseInt(balance.balance) / Math.pow(10, balance.tokenInfo?.decimals || 18)).toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="text-xs text-gray-500 mt-2">
                    Loading Safe balances...
                </div>
            )}
        </div>
    );
}
