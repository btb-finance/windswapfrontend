'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { formatUnits, Address } from 'viem';
import { useAccount } from 'wagmi';
import { V2_CONTRACTS, CL_CONTRACTS } from '@/config/contracts';
import { DEFAULT_TOKEN_LIST, WSEI } from '@/config/tokens';
import { RPC_ENDPOINTS, getSecondaryRpc, getPrimaryRpc, getRpcForPoolData, getRpcForVoting, getFallbackRpcs } from '@/utils/rpc';
import { useWindPrice as useWindPriceHook } from '@/hooks/useWindPrice';
import { useUserPositions, SubgraphVeNFT, SubgraphStakedPosition } from '@/hooks/useSubgraph';

// Goldsky Subgraph URL for pool data
const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cmjlh2t5mylhg01tm7t545rgk/subgraphs/windswap/v3.0.6/gn';

// Fetch pools from subgraph
async function fetchPoolsFromSubgraph(): Promise<{
    pools: Array<{
        id: string;
        token0: { id: string; symbol: string; decimals: number };
        token1: { id: string; symbol: string; decimals: number };
        tickSpacing: number;
        totalValueLockedUSD: string;
        volumeUSD: string;
        poolDayData: Array<{
            date: number;
            volumeUSD: string;
        }>;
    }>;
} | null> {
    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `{
                    pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
                        id
                        token0 { id symbol decimals }
                        token1 { id symbol decimals }
                        tickSpacing
                        totalValueLockedUSD
                        volumeUSD
                        poolDayData(first: 1, orderBy: date, orderDirection: desc) {
                            date
                            volumeUSD
                        }
                    }
                }`
            }),
        });
        const json = await response.json();
        if (json.errors) {
            console.warn('[Subgraph] Query errors:', json.errors);
            return null;
        }
        return json.data;
    } catch (err) {
        console.warn('[Subgraph] Fetch error:', err);
        return null;
    }
}

// Priority pool address - WIND/WSEI pool loads first with its APR
const PRIORITY_POOL = '0xc7035A2Ef7C685Fc853475744623A0F164541b69'.toLowerCase();
const PRIORITY_GAUGE = '0x65e450a9E7735c3991b1495C772aeDb33A1A91Cb'.toLowerCase();

// ============================================
// Types
// ============================================
interface TokenInfo {
    address: Address;
    symbol: string;
    decimals: number;
    logoURI?: string;
}

interface PoolData {
    address: Address;
    token0: TokenInfo;
    token1: TokenInfo;
    poolType: 'V2' | 'CL';
    stable?: boolean;
    tickSpacing?: number;
    reserve0: string;
    reserve1: string;
    tvl: string;
    volume24h?: string;
    rewardRate?: bigint;
}

// Gauge/Voting Types
export interface RewardToken {
    address: Address;
    symbol: string;
    amount: bigint;
    decimals: number;
}

export interface GaugeInfo {
    pool: Address;
    gauge: Address;
    token0: Address;
    token1: Address;
    symbol0: string;
    symbol1: string;
    poolType: 'V2' | 'CL';
    isStable: boolean;
    weight: bigint;
    weightPercent: number;
    isAlive: boolean;
    feeReward: Address;
    bribeReward: Address;
    rewardTokens: RewardToken[];
}

export interface StakedPosition {
    tokenId: bigint;
    gaugeAddress: string;
    poolAddress: string;
    token0: string;
    token1: string;
    token0Symbol: string;
    token1Symbol: string;
    token0Decimals: number;
    token1Decimals: number;
    tickSpacing: number;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    liquidity: bigint;
    pendingRewards: bigint;
    rewardRate: bigint;
}

export interface VeNFT {
    tokenId: bigint;
    amount: bigint;          // locked amount (renamed from lockedAmount for consistency)
    end: bigint;             // lock end timestamp
    isPermanent: boolean;    // permanent lock flag
    votingPower: bigint;
    claimable: bigint;       // claimable rebases
    hasVoted: boolean;       // whether veNFT has voted this epoch (blocks unlock/merge)
}

interface PoolDataContextType {
    v2Pools: PoolData[];
    clPools: PoolData[];
    allPools: PoolData[];
    tokenInfoMap: Map<string, TokenInfo>;
    poolRewards: Map<string, bigint>;
    // Staked liquidity for accurate APR calculation
    stakedLiquidity: Map<string, bigint>;
    // Prices for APR calculation (loaded with priority pool)
    windPrice: number;
    seiPrice: number;
    // Gauge/Voting data
    gauges: GaugeInfo[];
    totalVoteWeight: bigint;
    epochCount: bigint;
    activePeriod: bigint;
    gaugesLoading: boolean;
    // Staked positions (prefetched for portfolio)
    stakedPositions: StakedPosition[];
    stakedLoading: boolean;
    refetchStaked: () => void;
    removeStakedPosition: (tokenId: bigint, gaugeAddress: string) => void;
    // VeNFT data (prefetched for portfolio and vote)
    veNFTs: VeNFT[];
    veNFTsLoading: boolean;
    refetchVeNFTs: () => void;
    isLoading: boolean;
    refetch: () => void;
    getTokenInfo: (address: string) => TokenInfo | undefined;
}

const PoolDataContext = createContext<PoolDataContextType | undefined>(undefined);

// Build KNOWN_TOKENS from the global DEFAULT_TOKEN_LIST - single source of truth!
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number; logoURI?: string }> = {};
for (const token of DEFAULT_TOKEN_LIST) {
    // Use lowercase address as key for easy lookup
    KNOWN_TOKENS[token.address.toLowerCase()] = {
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
    };
}
// Also add WSEI explicitly (some pools use WSEI address directly)
KNOWN_TOKENS[WSEI.address.toLowerCase()] = {
    symbol: WSEI.symbol,
    decimals: WSEI.decimals,
    logoURI: WSEI.logoURI,
};

// ============================================
// Batch RPC Helper with retry and chunking
// ============================================
async function batchRpcCall(calls: { to: string; data: string }[], retries = 2, preferredRpc?: string): Promise<string[]> {
    // Split into smaller chunks to avoid rate limits (10 calls per batch)
    const CHUNK_SIZE = 10;

    if (calls.length > CHUNK_SIZE) {
        const results: string[] = [];
        for (let i = 0; i < calls.length; i += CHUNK_SIZE) {
            const chunk = calls.slice(i, i + CHUNK_SIZE);
            const chunkResults = await batchRpcCall(chunk, retries, preferredRpc);
            results.push(...chunkResults);
        }
        return results;
    }

    const batch = calls.map((call, i) => ({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: call.to, data: call.data }, 'latest'],
        id: i + 1
    }));

    // Use preferred RPC first, then cycle through all others as fallbacks
    const primary = preferredRpc || getSecondaryRpc();
    const rpcs = [primary, ...getFallbackRpcs(primary)];

    for (let attempt = 0; attempt <= retries; attempt++) {
        const rpcUrl = rpcs[Math.min(attempt, rpcs.length - 1)];
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            });

            const results = await response.json();
            return Array.isArray(results)
                ? results.sort((a: any, b: any) => a.id - b.id).map((r: any) => r.result || '0x')
                : [results.result || '0x'];
        } catch (err) {
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                continue;
            }
            console.warn('[batchRpcCall] All retries failed:', err);
            return calls.map(() => '0x');
        }
    }
    return calls.map(() => '0x');
}

// ============================================
// Provider Component
// ============================================
const CACHE_KEY = 'windswap_pool_cache';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

// Helper to load from localStorage
function loadCachedPools(): { clPools: PoolData[]; v2Pools: PoolData[]; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            // Check if cache is still valid (less than 1 hour old)
            if (Date.now() - data.timestamp < CACHE_EXPIRY) {
                // Loading from cache
                return data;
            }
        }
    } catch (e) {
        console.warn('[PoolDataProvider] Cache read error');
    }
    return null;
}

// Helper to save to localStorage
function saveCachePools(clPools: PoolData[], v2Pools: PoolData[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            clPools,
            v2Pools,
            timestamp: Date.now()
        }));
        // Saved to cache
    } catch (e) {
        console.warn('[PoolDataProvider] Cache write error');
    }
}

export function PoolDataProvider({ children }: { children: ReactNode }) {
    const { address } = useAccount();
    const [v2Pools, setV2Pools] = useState<PoolData[]>([]);
    const [clPools, setClPools] = useState<PoolData[]>([]);
    const [tokenInfoMap, setTokenInfoMap] = useState<Map<string, TokenInfo>>(new Map());
    const [poolRewards, setPoolRewards] = useState<Map<string, bigint>>(new Map());
    const [stakedLiquidity, setStakedLiquidity] = useState<Map<string, bigint>>(new Map());
    const [windPrice, setWindPrice] = useState<number>(0.005); // Default fallback
    const [seiPrice, setSeiPrice] = useState<number>(0.35); // Default fallback
    const [isLoading, setIsLoading] = useState(true);

    // Use the on-chain price hook as primary source
    const { windPrice: onChainWindPrice, seiPrice: onChainSeiPrice } = useWindPriceHook();

    // Sync on-chain prices to local state (only if they're valid)
    useEffect(() => {
        if (onChainWindPrice > 0) {
            setWindPrice(onChainWindPrice);
        }
        if (onChainSeiPrice > 0) {
            setSeiPrice(onChainSeiPrice);
        }
    }, [onChainWindPrice, onChainSeiPrice]);

    // Gauge/Voting state
    const [gauges, setGauges] = useState<GaugeInfo[]>([]);
    const [totalVoteWeight, setTotalVoteWeight] = useState<bigint>(BigInt(0));
    const [epochCount, setEpochCount] = useState<bigint>(BigInt(0));
    const [activePeriod, setActivePeriod] = useState<bigint>(BigInt(0));
    const [gaugesLoading, setGaugesLoading] = useState(true);

    // ============================================
    // SUBGRAPH-BASED USER DATA (replaces RPC fetching)
    // ============================================
    const {
        veNFTs: subgraphVeNFTs,
        stakedPositions: subgraphStaked,
        isLoading: userDataLoading,
        refetch: refetchUserData
    } = useUserPositions(address);

    // Helper to convert decimal string to wei (BigInt)
    const toWei = (value: string | undefined): bigint => {
        if (!value) return BigInt(0);
        const num = parseFloat(value);
        if (isNaN(num)) return BigInt(0);
        // Convert to wei (18 decimals)
        return BigInt(Math.floor(num * 1e18));
    };

    // Transform subgraph veNFT data to provider format
    const veNFTs: VeNFT[] = subgraphVeNFTs.map(nft => ({
        tokenId: BigInt(nft.tokenId),
        amount: toWei(nft.lockedAmount),
        end: BigInt(nft.lockEnd || '0'),
        isPermanent: nft.isPermanent,
        votingPower: toWei(nft.votingPower),
        claimable: toWei(nft.claimableRewards),
        hasVoted: nft.hasVoted,  // Now from subgraph
    }));

    // Transform subgraph staked position data to provider format
    const stakedPositions: StakedPosition[] = subgraphStaked.map(sp => {
        const gauge = sp.gauge;
        const pool = gauge?.pool;
        const known0 = pool?.token0 ? KNOWN_TOKENS[pool.token0.id.toLowerCase()] : null;
        const known1 = pool?.token1 ? KNOWN_TOKENS[pool.token1.id.toLowerCase()] : null;

        return {
            tokenId: BigInt(sp.tokenId || '0'),
            gaugeAddress: gauge?.id as Address || '' as Address,
            poolAddress: pool?.id as Address || '' as Address,
            token0: pool?.token0?.id as Address || '' as Address,
            token1: pool?.token1?.id as Address || '' as Address,
            token0Symbol: known0?.symbol || pool?.token0?.symbol || 'UNK',
            token1Symbol: known1?.symbol || pool?.token1?.symbol || 'UNK',
            token0Decimals: pool?.token0?.decimals || known0?.decimals || 18,
            token1Decimals: pool?.token1?.decimals || known1?.decimals || 18,
            tickSpacing: pool?.tickSpacing || 0,
            tickLower: sp.tickLower ?? sp.position?.tickLower ?? 0,
            tickUpper: sp.tickUpper ?? sp.position?.tickUpper ?? 0,
            currentTick: pool?.tick || 0,
            liquidity: BigInt(sp.position?.liquidity || sp.amount || '0'),
            pendingRewards: BigInt(sp.earned || '0'),
            rewardRate: BigInt(0),
        };
    });

    // Sync loading states
    const stakedLoading = userDataLoading;
    const veNFTsLoading = userDataLoading;

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setGaugesLoading(true);
        try {
            // Step 0: Try loading from localStorage cache FIRST (instant!)
            const cached = loadCachedPools();
            if (cached && cached.clPools.length > 0) {
                setClPools(cached.clPools);
                setV2Pools(cached.v2Pools);
                setIsLoading(false); // Show cached data immediately!
                // Loaded pools from cache
            }

            // Step 1: Try fetching from SUBGRAPH (primary source - all pools!)
            // Fetching from subgraph
            const subgraphData = await fetchPoolsFromSubgraph();

            if (subgraphData && subgraphData.pools.length > 0) {
                // Got pools from subgraph

                // Convert subgraph pools to PoolData format
                const subgraphPools: PoolData[] = subgraphData.pools.map(p => {
                    const known0 = KNOWN_TOKENS[p.token0.id.toLowerCase()];
                    const known1 = KNOWN_TOKENS[p.token1.id.toLowerCase()];

                    // Parse TVL (subgraph gives us USD value directly)
                    const tvl = parseFloat(p.totalValueLockedUSD || '0');

                    // Approx. 24h volume from latest PoolDayData (UTC day bucket)
                    const latestDay = p.poolDayData && p.poolDayData.length > 0 ? p.poolDayData[0] : undefined;
                    const volume24h = latestDay ? parseFloat(latestDay.volumeUSD || '0') : 0;

                    return {
                        address: p.id as Address,
                        token0: {
                            address: p.token0.id as Address,
                            symbol: known0?.symbol || p.token0.symbol,
                            decimals: known0?.decimals || p.token0.decimals,
                            logoURI: known0?.logoURI,
                        },
                        token1: {
                            address: p.token1.id as Address,
                            symbol: known1?.symbol || p.token1.symbol,
                            decimals: known1?.decimals || p.token1.decimals,
                            logoURI: known1?.logoURI,
                        },
                        poolType: 'CL' as const,
                        stable: false,
                        tickSpacing: typeof p.tickSpacing === 'number' ? p.tickSpacing : parseInt(String(p.tickSpacing)) || 0,
                        reserve0: '0', // Subgraph doesn't give individual reserves
                        reserve1: '0',
                        tvl: tvl > 0 ? tvl.toFixed(2) : '0',
                        volume24h: volume24h > 0 ? volume24h.toFixed(2) : undefined,
                    };
                });

                // Sort pools to put priority pool FIRST for immediate display
                subgraphPools.sort((a, b) => {
                    const aIsPriority = a.address.toLowerCase() === PRIORITY_POOL;
                    const bIsPriority = b.address.toLowerCase() === PRIORITY_POOL;
                    if (aIsPriority && !bIsPriority) return -1;
                    if (bIsPriority && !aIsPriority) return 1;
                    return 0;
                });

                // Set pools from subgraph (for immediate display - priority pool first!)
                setClPools(subgraphPools);
                setIsLoading(false);
                // Showing pools from subgraph

                // Build token map from subgraph data
                const newTokenMap = new Map<string, TokenInfo>();
                subgraphPools.forEach(p => {
                    newTokenMap.set(p.token0.address.toLowerCase(), p.token0);
                    newTokenMap.set(p.token1.address.toLowerCase(), p.token1);
                });
                setTokenInfoMap(newTokenMap);

                // ⚡ PRIORITY: Fetch WIND/WSEI pool balance + APR IMMEDIATELY (don't await)
                const priorityPool = subgraphPools.find(p => p.address.toLowerCase() === PRIORITY_POOL);
                const priorityFetchPromise = priorityPool ? (async () => {
                    try {
                        // Only fetch reward rate
                        const priorityCalls = [
                            { to: PRIORITY_GAUGE, data: '0x7b0a47ee' }, // rewardRate()
                        ];
                        const [rewardRateHex] = await batchRpcCall(priorityCalls, 2, getRpcForVoting());

                        // Update reward rate for priority pool
                        const rewardRate = rewardRateHex !== '0x' ? BigInt(rewardRateHex) : BigInt(0);
                        if (rewardRate > BigInt(0)) {
                            setPoolRewards(prev => new Map(prev).set(PRIORITY_POOL, rewardRate));
                        }
                    } catch (err) {
                        console.warn('[PoolDataProvider] Priority pool fetch error:', err);
                    }
                })() : Promise.resolve();

                // Start priority fetch immediately (non-blocking)
                priorityFetchPromise.catch(() => { }); // Handle silently

                // Fetch gauge data for voting (in parallel with priority fetch)
                await fetchGaugeData(newTokenMap);

                // Save subgraph pools to cache
                saveCachePools(subgraphPools, []);

                return; // Done!
            } else {
                // Subgraph failed or empty - fall back to GAUGE_LIST
                // Subgraph empty/failed, using GAUGE_LIST

                if (!cached || cached.clPools.length === 0) {
                    try {
                        const { GAUGE_LIST } = await import('@/config/gauges');

                        // Build quick pool list from gauges for instant display
                        const quickClPools: PoolData[] = GAUGE_LIST.map(g => {
                            const known0 = KNOWN_TOKENS[g.token0.toLowerCase()];
                            const known1 = KNOWN_TOKENS[g.token1.toLowerCase()];
                            return {
                                address: g.pool as Address,
                                token0: {
                                    address: g.token0 as Address,
                                    symbol: known0?.symbol || g.symbol0,
                                    decimals: known0?.decimals || 18,
                                    logoURI: known0?.logoURI,
                                },
                                token1: {
                                    address: g.token1 as Address,
                                    symbol: known1?.symbol || g.symbol1,
                                    decimals: known1?.decimals || 18,
                                    logoURI: known1?.logoURI,
                                },
                                poolType: g.type,
                                stable: false,
                                tickSpacing: g.tickSpacing,
                                reserve0: '0',
                                reserve1: '0',
                                tvl: '0',
                            };
                        });

                        // Set pools immediately for fast display (preserve volume24h)
                        if (quickClPools.length > 0) {
                            setClPools(prev => {
                                const volumeMap = new Map(prev.map(p => [p.address.toLowerCase(), p.volume24h]));
                                return quickClPools.filter(p => p.poolType === 'CL').map(pool => ({
                                    ...pool,
                                    volume24h: volumeMap.get(pool.address.toLowerCase()) || pool.volume24h
                                }));
                            });
                            setV2Pools(quickClPools.filter(p => p.poolType === 'V2'));
                            setIsLoading(false); // Show pools immediately!
                        }
                    } catch (e) {
                        console.warn('[PoolDataProvider] Could not load GAUGE_LIST for quick display');
                    }
                }
            }

            // Step 1: Get pool counts
            const countCalls = [
                { to: V2_CONTRACTS.PoolFactory, data: '0xefde4e64' }, // allPoolsLength()
                { to: CL_CONTRACTS.CLFactory, data: '0xefde4e64' },
            ];
            const [v2CountHex, clCountHex] = await batchRpcCall(countCalls, 2, getRpcForPoolData());
            const v2Count = Math.min(parseInt(v2CountHex, 16) || 0, 30);
            const clCount = Math.min(parseInt(clCountHex, 16) || 0, 30);

            // Step 2: Get pool addresses
            const addressCalls: { to: string; data: string }[] = [];
            for (let i = 0; i < v2Count; i++) {
                addressCalls.push({
                    to: V2_CONTRACTS.PoolFactory,
                    data: `0x41d1de97${i.toString(16).padStart(64, '0')}` // allPools(uint256)
                });
            }
            for (let i = 0; i < clCount; i++) {
                addressCalls.push({
                    to: CL_CONTRACTS.CLFactory,
                    data: `0x41d1de97${i.toString(16).padStart(64, '0')}`
                });
            }

            const addressResults = await batchRpcCall(addressCalls, 2, getRpcForPoolData());
            const v2Addresses = addressResults.slice(0, v2Count)
                .map(r => r.length >= 42 ? `0x${r.slice(-40)}` as Address : null)
                .filter((addr): addr is Address => addr !== null && addr !== '0x0000000000000000000000000000000000000000');
            const clAddresses = addressResults.slice(v2Count)
                .map(r => r.length >= 42 ? `0x${r.slice(-40)}` as Address : null)
                .filter((addr): addr is Address => addr !== null && addr !== '0x0000000000000000000000000000000000000000');

            // Step 3: Get pool details (token0, token1, stable/tickSpacing, reserves/liquidity)
            const detailCalls: { to: string; data: string }[] = [];

            // V2 pools: token0, token1, stable, getReserves
            for (const addr of v2Addresses) {
                detailCalls.push({ to: addr, data: '0x0dfe1681' }); // token0()
                detailCalls.push({ to: addr, data: '0xd21220a7' }); // token1()
                detailCalls.push({ to: addr, data: '0x22be3de1' }); // stable()
                detailCalls.push({ to: addr, data: '0x0902f1ac' }); // getReserves()
            }

            // CL pools: token0, token1, tickSpacing, liquidity
            for (const addr of clAddresses) {
                detailCalls.push({ to: addr, data: '0x0dfe1681' }); // token0()
                detailCalls.push({ to: addr, data: '0xd21220a7' }); // token1()
                detailCalls.push({ to: addr, data: '0xd0c93a7c' }); // tickSpacing()
                detailCalls.push({ to: addr, data: '0x1a686502' }); // liquidity()
            }

            const detailResults = await batchRpcCall(detailCalls, 2, getRpcForPoolData());

            // Parse V2 pool details
            const v2Details: { addr: Address; token0: Address; token1: Address; stable: boolean; reserve0: bigint; reserve1: bigint }[] = [];
            for (let i = 0; i < v2Addresses.length; i++) {
                const base = i * 4;
                v2Details.push({
                    addr: v2Addresses[i],
                    token0: `0x${detailResults[base].slice(-40)}` as Address,
                    token1: `0x${detailResults[base + 1].slice(-40)}` as Address,
                    stable: detailResults[base + 2] !== '0x' && parseInt(detailResults[base + 2], 16) === 1,
                    reserve0: detailResults[base + 3].length >= 66 ? BigInt('0x' + detailResults[base + 3].slice(2, 66)) : BigInt(0),
                    reserve1: detailResults[base + 3].length >= 130 ? BigInt('0x' + detailResults[base + 3].slice(66, 130)) : BigInt(0),
                });
            }

            // Parse CL pool details
            const clOffset = v2Addresses.length * 4;
            const clDetails: { addr: Address; token0: Address; token1: Address; tickSpacing: number; liquidity: bigint }[] = [];
            for (let i = 0; i < clAddresses.length; i++) {
                const base = clOffset + i * 4;
                clDetails.push({
                    addr: clAddresses[i],
                    token0: `0x${detailResults[base].slice(-40)}` as Address,
                    token1: `0x${detailResults[base + 1].slice(-40)}` as Address,
                    tickSpacing: parseInt(detailResults[base + 2], 16) || 0,
                    liquidity: detailResults[base + 3] !== '0x' ? BigInt(detailResults[base + 3]) : BigInt(0),
                });
            }

            // Step 4: Get unique token addresses and fetch their info
            const allTokens = new Set<string>();
            v2Details.forEach(p => { allTokens.add(p.token0.toLowerCase()); allTokens.add(p.token1.toLowerCase()); });
            clDetails.forEach(p => { allTokens.add(p.token0.toLowerCase()); allTokens.add(p.token1.toLowerCase()); });

            const tokenCalls: { to: string; data: string }[] = [];
            const tokenAddresses = [...allTokens];
            for (const addr of tokenAddresses) {
                tokenCalls.push({ to: addr, data: '0x95d89b41' }); // symbol()
                tokenCalls.push({ to: addr, data: '0x313ce567' }); // decimals()
            }

            const tokenResults = await batchRpcCall(tokenCalls, 2, getRpcForPoolData());
            const newTokenMap = new Map<string, TokenInfo>();

            for (let i = 0; i < tokenAddresses.length; i++) {
                const symbolHex = tokenResults[i * 2];
                const decimalsHex = tokenResults[i * 2 + 1];

                let symbol = 'UNKNOWN';
                try {
                    if (symbolHex && symbolHex.length > 2) {
                        const hex = symbolHex.slice(2);
                        if (hex.length >= 128) {
                            const len = parseInt(hex.slice(64, 128), 16);
                            symbol = Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
                        }
                    }
                } catch { }

                const decimals = decimalsHex ? parseInt(decimalsHex, 16) || 18 : 18;

                // Get logoURI from KNOWN_TOKENS if available
                const knownToken = KNOWN_TOKENS[tokenAddresses[i].toLowerCase()];

                newTokenMap.set(tokenAddresses[i].toLowerCase(), {
                    address: tokenAddresses[i] as Address,
                    symbol: knownToken?.symbol || symbol, // Prefer known symbol
                    decimals: knownToken?.decimals || decimals,
                    logoURI: knownToken?.logoURI, // Add logo from global token list
                });
            }

            setTokenInfoMap(newTokenMap);

            // Build final pool data
            const newV2Pools: PoolData[] = v2Details.map(p => {
                const t0 = newTokenMap.get(p.token0.toLowerCase());
                const t1 = newTokenMap.get(p.token1.toLowerCase());
                const r0 = t0 ? formatUnits(p.reserve0, t0.decimals) : '0';
                const r1 = t1 ? formatUnits(p.reserve1, t1.decimals) : '0';
                const known0 = KNOWN_TOKENS[p.token0.toLowerCase()];
                const known1 = KNOWN_TOKENS[p.token1.toLowerCase()];
                return {
                    address: p.addr,
                    token0: t0 || (known0 ? { address: p.token0, ...known0 } : { address: p.token0, symbol: 'UNK', decimals: 18 }),
                    token1: t1 || (known1 ? { address: p.token1, ...known1 } : { address: p.token1, symbol: 'UNK', decimals: 18 }),
                    poolType: 'V2' as const,
                    stable: p.stable,
                    reserve0: r0,
                    reserve1: r1,
                    tvl: (parseFloat(r0) + parseFloat(r1)).toFixed(2),
                };
            });

            const newClPools: PoolData[] = clDetails.map(p => {
                const t0 = newTokenMap.get(p.token0.toLowerCase());
                const t1 = newTokenMap.get(p.token1.toLowerCase());
                const known0 = KNOWN_TOKENS[p.token0.toLowerCase()];
                const known1 = KNOWN_TOKENS[p.token1.toLowerCase()];
                return {
                    address: p.addr,
                    token0: t0 || (known0 ? { address: p.token0, ...known0 } : { address: p.token0, symbol: 'UNK', decimals: 18 }),
                    token1: t1 || (known1 ? { address: p.token1, ...known1 } : { address: p.token1, symbol: 'UNK', decimals: 18 }),
                    poolType: 'CL' as const,
                    tickSpacing: p.tickSpacing,
                    reserve0: '0',
                    reserve1: '0',
                    tvl: p.liquidity > BigInt(0) ? (Number(p.liquidity) / 1e18).toFixed(2) : '0',
                };
            });

            // Save to cache after pools are set
            setClPools(currentPools => {
                saveCachePools(currentPools, v2Pools);
                return currentPools;
            });

            // Update V2 pools with reserve data (from v2Details which is correct since no V2 pools in GAUGE_LIST)
            const v2ReservesMap = new Map<string, { reserve0: bigint; reserve1: bigint }>();
            v2Details.forEach(p => v2ReservesMap.set(p.addr.toLowerCase(), { reserve0: p.reserve0, reserve1: p.reserve1 }));
            setV2Pools(prev => prev.map(pool => {
                const reserves = v2ReservesMap.get(pool.address.toLowerCase());
                if (reserves) {
                    const r0 = Number(reserves.reserve0) / 1e18;
                    const r1 = Number(reserves.reserve1) / 1e18;
                    return { ...pool, reserve0: r0.toString(), reserve1: r1.toString(), tvl: (r0 + r1).toFixed(2) };
                }
                return pool;
            }));

            // Step 5: Fetch reward rates for pools with gauges
            const allPoolAddrs = [...v2Addresses, ...clAddresses];
            const gaugeCalls = allPoolAddrs.map(addr => ({
                to: V2_CONTRACTS.Voter,
                data: `0xb9a09fd5${addr.slice(2).padStart(64, '0')}` // gauges(address)
            }));

            const gaugeResults = await batchRpcCall(gaugeCalls, 2, getRpcForVoting());
            const gaugeAddresses = gaugeResults.map(r => r !== '0x' && r !== '0x' + '0'.repeat(64) ? `0x${r.slice(-40)}` : null);

            const rewardCalls = gaugeAddresses
                .map((g, i) => g ? { to: g, data: '0x7b0a47ee', poolAddr: allPoolAddrs[i] } : null)
                .filter((c): c is { to: string; data: string; poolAddr: Address } => c !== null);

            if (rewardCalls.length > 0) {
                const rewardResults = await batchRpcCall(rewardCalls.map(c => ({ to: c.to, data: c.data })), 2, getRpcForVoting());
                const newRewards = new Map<string, bigint>();
                rewardCalls.forEach((call, i) => {
                    const rate = rewardResults[i] !== '0x' ? BigInt(rewardResults[i]) : BigInt(0);
                    if (rate > BigInt(0)) {
                        newRewards.set(call.poolAddr.toLowerCase(), rate);
                    }
                });
                setPoolRewards(newRewards);
            }

            setIsLoading(false);

            // ============================================
            // Step 6: Fetch Gauge/Voting Data (for /vote page)
            // ============================================
            await fetchGaugeData(newTokenMap);

        } catch (err) {
            console.error('[PoolDataProvider] Fetch error:', err);
            setIsLoading(false);
            setGaugesLoading(false);
        }
    }, []);

    // Fetch gauge/voting data from Goldsky subgraph (read-only)
    const fetchGaugeData = useCallback(async (_tokenMap: Map<string, TokenInfo>) => {
        try {
            const query = `query VoteData {
                protocol(id: "windswap") {
                    totalVotingWeight
                    epochCount
                    activePeriod
                }
                gauges(first: 200, where: { isActive: true }) {
                    id
                    pool { id token0 { id symbol decimals } token1 { id symbol decimals } }
                    gaugeType
                    weight
                    isActive
                    feeVotingReward
                    bribeVotingReward
                    epochData(first: 1, orderBy: epoch, orderDirection: desc) {
                        epoch
                        feeRewardToken0
                        feeRewardToken1
                    }
                }
            }`;

            const response = await fetch(SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const json = await response.json();
            if (json.errors) {
                throw new Error(json.errors[0]?.message || 'Subgraph error');
            }

            const protocol = json.data?.protocol;
            if (protocol) {
                const total = protocol.totalVotingWeight ? BigInt(protocol.totalVotingWeight) : BigInt(0);
                setTotalVoteWeight(total);
                setEpochCount(protocol.epochCount ? BigInt(protocol.epochCount) : BigInt(0));
                setActivePeriod(protocol.activePeriod ? BigInt(protocol.activePeriod) : BigInt(0));
            }

            const decimalToBigInt = (value: string | null | undefined, decimals: number): bigint => {
                if (!value) return BigInt(0);
                const num = parseFloat(value);
                if (!isFinite(num) || num <= 0) return BigInt(0);
                return BigInt(Math.floor(num * Math.pow(10, decimals)));
            };

            const gaugeRows: any[] = json.data?.gauges || [];
            const totalWeight = protocol?.totalVotingWeight ? BigInt(protocol.totalVotingWeight) : BigInt(0);

            const gaugeList: GaugeInfo[] = gaugeRows.map((g: any) => {
                const poolId = String(g.pool?.id || '').toLowerCase();
                const token0 = String(g.pool?.token0?.id || '0x0000000000000000000000000000000000000000');
                const token1 = String(g.pool?.token1?.id || '0x0000000000000000000000000000000000000000');
                const symbol0 = String(g.pool?.token0?.symbol || 'UNK');
                const symbol1 = String(g.pool?.token1?.symbol || 'UNK');
                const decimals0 = Number(g.pool?.token0?.decimals ?? 18);
                const decimals1 = Number(g.pool?.token1?.decimals ?? 18);

                const weight = g.weight ? BigInt(g.weight) : BigInt(0);
                const weightPercent = totalWeight > BigInt(0)
                    ? Number((weight * BigInt(10000)) / totalWeight) / 100
                    : 0;

                const epochData = Array.isArray(g.epochData) && g.epochData.length > 0 ? g.epochData[0] : null;
                const fee0 = decimalToBigInt(epochData?.feeRewardToken0, decimals0);
                const fee1 = decimalToBigInt(epochData?.feeRewardToken1, decimals1);
                const rewardTokens: RewardToken[] = [];
                if (fee0 > BigInt(0)) {
                    rewardTokens.push({ address: token0 as Address, symbol: symbol0, amount: fee0, decimals: decimals0 });
                }
                if (fee1 > BigInt(0)) {
                    rewardTokens.push({ address: token1 as Address, symbol: symbol1, amount: fee1, decimals: decimals1 });
                }

                return {
                    pool: poolId as Address,
                    gauge: String(g.id) as Address,
                    token0: token0 as Address,
                    token1: token1 as Address,
                    symbol0,
                    symbol1,
                    poolType: (String(g.gaugeType || 'CL') === 'V2' ? 'V2' : 'CL') as 'V2' | 'CL',
                    isStable: false,
                    weight,
                    weightPercent,
                    isAlive: !!g.isActive,
                    feeReward: (String(g.feeVotingReward || '0x0000000000000000000000000000000000000000')) as Address,
                    bribeReward: (String(g.bribeVotingReward || '0x0000000000000000000000000000000000000000')) as Address,
                    rewardTokens,
                };
            });

            setGauges(gaugeList);
        } catch (err) {
            console.error('[PoolDataProvider] Gauge fetch error:', err);
        }
        setGaugesLoading(false);
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Auto-refresh every 10 minutes (only if page is still open)
    useEffect(() => {
        const TEN_MINUTES = 10 * 60 * 1000;
        const interval = setInterval(fetchAllData, TEN_MINUTES);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    const getTokenInfo = useCallback((address: string) => {
        return tokenInfoMap.get(address.toLowerCase());
    }, [tokenInfoMap]);


    // Refetch functions for staked positions and veNFTs (triggers subgraph refetch)
    const refetchStaked = useCallback(() => {
        refetchUserData();
    }, [refetchUserData]);

    const refetchVeNFTs = useCallback(() => {
        refetchUserData();
    }, [refetchUserData]);

    // Optimistic removal of staked position (won't persist after refetch)
    // This is a no-op now since data comes from subgraph - just trigger refetch
    const removeStakedPosition = useCallback((_tokenId: bigint, _gaugeAddress: string) => {
        // Trigger a refetch to get fresh data from subgraph
        refetchUserData();
    }, [refetchUserData]);

    const value: PoolDataContextType = {
        v2Pools,
        clPools,
        allPools: [...v2Pools, ...clPools],
        tokenInfoMap,
        poolRewards,
        stakedLiquidity,
        windPrice,
        seiPrice,
        gauges,
        totalVoteWeight,
        epochCount,
        activePeriod,
        gaugesLoading,
        stakedPositions,
        stakedLoading,
        refetchStaked,
        removeStakedPosition,
        veNFTs,
        veNFTsLoading,
        refetchVeNFTs,
        isLoading,
        refetch: fetchAllData,
        getTokenInfo,
    };

    return (
        <PoolDataContext.Provider value={value}>
            {children}
        </PoolDataContext.Provider>
    );
}

// ============================================
// Hook
// ============================================
export function usePoolData() {
    const context = useContext(PoolDataContext);
    if (!context) {
        throw new Error('usePoolData must be used within PoolDataProvider');
    }
    return context;
}
