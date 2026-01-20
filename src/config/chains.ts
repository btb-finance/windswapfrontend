// Sei Mainnet Chain Configuration
import { defineChain } from 'viem';

export const sei = defineChain({
    id: 1329,
    name: 'Sei',
    nativeCurrency: {
        decimals: 18,
        name: 'Sei',
        symbol: 'SEI',
    },
    rpcUrls: {
        default: {
            http: ['https://evm-rpc.sei-apis.com/?x-apikey=f9e3e8c8'],
            webSocket: ['wss://evm-ws.sei-apis.com'],
        },
    },
    blockExplorers: {
        default: { name: 'SeiScan', url: 'https://seiscan.io' },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 0,
        },
    },
});

export const WSEI_ADDRESS = '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7';

// Ethereum Mainnet Chain Configuration (for BTB Finance)
export const ethereum = defineChain({
    id: 1,
    name: 'Ethereum',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://eth.llamarpc.com'],
        },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: 'https://etherscan.io' },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 14353601,
        },
    },
});

export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
