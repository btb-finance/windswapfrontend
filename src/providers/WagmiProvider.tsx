'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import {
    RainbowKitProvider,
    darkTheme,
    getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
    metaMaskWallet,
    coinbaseWallet,
    walletConnectWallet,
    trustWallet,
    okxWallet,
    bitgetWallet,
    rainbowWallet,
    rabbyWallet,
    phantomWallet,
    braveWallet,
    safeWallet,
    compassWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { sei, ethereum } from '@/config/chains';
import { base } from 'viem/chains';
import { PoolDataProvider } from '@/providers/PoolDataProvider';
import { UserBalanceProvider } from '@/providers/UserBalanceProvider';
import { SafeAutoConnect } from '@/components/SafeAutoConnect';
import '@rainbow-me/rainbowkit/styles.css';

const projectId = 'ecd20f8c23408a4397afc0f5466eb6b6';

const config = getDefaultConfig({
    appName: 'Wind Swap',
    projectId,
    chains: [sei, ethereum, base],
    transports: {
        [sei.id]: http('https://evm-rpc.sei-apis.com/?x-apikey=f9e3e8c8'),
        [ethereum.id]: http('https://eth.llamarpc.com'),
        [base.id]: http('https://mainnet.base.org'),
    },
    ssr: false, // SSR disabled - we dynamically import this with ssr:false
    // Disable auto-detection to prevent wallet conflicts
    multiInjectedProviderDiscovery: false,
    wallets: [
        {
            groupName: 'Popular',
            wallets: [
                compassWallet,       // Compass first - Sei's native wallet
                rabbyWallet,
                metaMaskWallet,
                coinbaseWallet,
                trustWallet,
                phantomWallet,
            ],
        },
        {
            groupName: 'More',
            wallets: [
                okxWallet,
                braveWallet,
                walletConnectWallet,
                rainbowWallet,
                bitgetWallet,
                safeWallet,
            ],
        },
    ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#6366f1',
                        accentColorForeground: 'white',
                        borderRadius: 'medium',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                    modalSize="compact"
                >
                    <PoolDataProvider>
                        <UserBalanceProvider>
                            <SafeAutoConnect>
                                {children}
                            </SafeAutoConnect>
                        </UserBalanceProvider>
                    </PoolDataProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
