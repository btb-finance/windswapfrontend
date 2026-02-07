'use client';

import { useCallback, useState } from 'react';
import { useMetaMaskSDK, useWalletConnectProvider } from '@/hooks/useWalletProviders';

// ==========================================
// Standalone Wallet Connectors
// Direct SDK integrations for advanced wallet features
// ==========================================
export function StandaloneWalletConnectors() {
    const metaMask = useMetaMaskSDK();
    const walletConnect = useWalletConnectProvider();

    const [isInitializing, setIsInitializing] = useState<string | null>(null);

    const handleConnect = useCallback(async (type: 'metamask' | 'walletconnect') => {
        setIsInitializing(type);
        try {
            switch (type) {
                case 'metamask':
                    await metaMask.initializeMetaMask();
                    await metaMask.connectMetaMask();
                    break;
                case 'walletconnect':
                    await walletConnect.initializeWalletConnect();
                    await walletConnect.connectWalletConnect();
                    break;
            }
        } finally {
            setIsInitializing(null);
        }
    }, [metaMask, walletConnect]);

    return (
        <div className="standalone-connectors space-y-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
                Advanced Wallet Options
            </h3>

            {/* MetaMask SDK */}
            <button
                onClick={() => handleConnect('metamask')}
                disabled={isInitializing !== null}
                className="w-full flex items-center justify-between p-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">M</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">MetaMask SDK</p>
                        <p className="text-xs text-orange-200">Mobile & extension support</p>
                    </div>
                </div>
                {isInitializing === 'metamask' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <span className="text-white text-lg">&rarr;</span>
                )}
            </button>

            {/* WalletConnect */}
            <button
                onClick={() => handleConnect('walletconnect')}
                disabled={isInitializing !== null || !walletConnect.isAvailable}
                className="w-full flex items-center justify-between p-3 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-blue-500 font-bold text-xs">WC</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">WalletConnect 2.0</p>
                        <p className="text-xs text-blue-100">Connect 300+ wallets</p>
                    </div>
                </div>
                {isInitializing === 'walletconnect' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <span className="text-white text-lg">&rarr;</span>
                )}
            </button>

            <div className="text-xs text-gray-500 mt-4 text-center">
                These options use direct SDK integrations for advanced features
            </div>
        </div>
    );
}
