'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useWriteContract } from '@/hooks/useWriteContract';
import { useBatchTransactions } from '@/hooks/useBatchTransactions';
import { Address, formatUnits } from 'viem';
import Link from 'next/link';
import { CL_CONTRACTS, V2_CONTRACTS } from '@/config/contracts';
import { WSEI, Token } from '@/config/tokens';
import { getTokenLogo as getTokenLogoUtil, getTokenDisplayInfo } from '@/utils/tokens';
import { formatPrice } from '@/utils/format';
import { useCLPositions, useV2Positions } from '@/hooks/usePositions';
import { NFT_POSITION_MANAGER_ABI, ERC20_ABI, ROUTER_ABI } from '@/config/abis';
import { usePoolData } from '@/providers/PoolDataProvider';
import { getRpcForPoolData } from '@/utils/rpc';
import { useToast } from '@/providers/ToastProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

// Goldsky GraphQL endpoint (v3.0.6)
const SUBGRAPH_URL = 'https://api.goldsky.com/api/public/project_cmjlh2t5mylhg01tm7t545rgk/subgraphs/windswap/v3.0.7/gn';

async function fetchGaugeAddressByPool(poolId: string): Promise<string | null> {
    try {
        const query = `query GaugeByPool($pool: String!) {
            gauges(first: 1, where: { pool: $pool }) {
                id
            }
        }`;

        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { pool: poolId.toLowerCase() } }),
        });

        const json = await response.json();
        const id = json?.data?.gauges?.[0]?.id;
        return typeof id === 'string' && id.length > 0 ? id : null;
    } catch {
        return null;
    }
}

// VotingEscrow ABI for veNFT data
const VOTING_ESCROW_ABI = [
    {
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
        name: 'tokenOfOwnerByIndex',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'locked',
        outputs: [{ name: 'amount', type: 'int128' }, { name: 'end', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'balanceOfNFT',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// CL Gauge ABI for staking/claiming
const CL_GAUGE_ABI = [
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'deposit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'withdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'getReward',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
        name: 'earned',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

interface VeNFT {
    tokenId: bigint;
    amount: bigint;          // locked amount
    end: bigint;             // lock end timestamp
    isPermanent: boolean;    // permanent lock flag
    votingPower: bigint;
    claimable: bigint;       // claimable rebases
}

interface StakedPosition {
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
    liquidity: bigint;
    pendingRewards: bigint;
    rewardRate: bigint;
}

// Get token info from known token list (uses centralized utility)
const getTokenInfo = (addr: string) => {
    const info = getTokenDisplayInfo(addr);
    return { symbol: info.symbol, decimals: info.decimals };
};

// Get token logo from known token list (uses centralized utility)
const getTokenLogo = (addr: string): string | undefined => {
    return getTokenLogoUtil(addr);
};

// Calculate token amounts from CL position liquidity and tick range
// This uses the Uniswap V3 math formulas
const calculateTokenAmounts = (
    liquidity: bigint,
    tickLower: number,
    tickUpper: number,
    currentTick: number,
    token0Decimals: number,
    token1Decimals: number
): { amount0: number; amount1: number } => {
    if (liquidity === BigInt(0)) {
        return { amount0: 0, amount1: 0 };
    }

    // Calculate sqrt prices from ticks
    const sqrtPriceLower = Math.pow(1.0001, tickLower / 2);
    const sqrtPriceUpper = Math.pow(1.0001, tickUpper / 2);
    const sqrtPriceCurrent = Math.pow(1.0001, currentTick / 2);

    const L = Number(liquidity);
    let amount0 = 0;
    let amount1 = 0;

    if (currentTick < tickLower) {
        // Position is below the range, only token0
        amount0 = L * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
        amount1 = 0;
    } else if (currentTick >= tickUpper) {
        // Position is above the range, only token1
        amount0 = 0;
        amount1 = L * (sqrtPriceUpper - sqrtPriceLower);
    } else {
        // Position is in range
        amount0 = L * (1 / sqrtPriceCurrent - 1 / sqrtPriceUpper);
        amount1 = L * (sqrtPriceCurrent - sqrtPriceLower);
    }

    // Adjust for decimals
    amount0 = amount0 / Math.pow(10, token0Decimals);
    amount1 = amount1 / Math.pow(10, token1Decimals);

    return { amount0, amount1 };
};

// CL tick constants - positions using these are "full range"
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Threshold for considering a position as "full range" (within 10% of min/max ticks)
const isFullRangePosition = (tickLower: number, tickUpper: number): boolean => {
    const tickRange = MAX_TICK - MIN_TICK;
    const positionRange = tickUpper - tickLower;
    // If the position covers more than 90% of the tick range, consider it "full range"
    return positionRange > tickRange * 0.9;
};

// Check if tick values are at or near the extremes (for display purposes)
const isExtremeTickRange = (tickLower: number, tickUpper: number): boolean => {
    // Consider extreme if lower tick is below -800000 or upper tick is above 800000
    return tickLower < -800000 || tickUpper > 800000;
};

// Convert tick to price (token1/token0)
const tickToPrice = (tick: number, token0Decimals: number, token1Decimals: number): number => {
    const rawPrice = Math.pow(1.0001, tick);
    // Adjust for decimals: actualPrice = rawPrice * 10^(token0Decimals - token1Decimals)
    return rawPrice * Math.pow(10, token0Decimals - token1Decimals);
};

// Check if position is in range based on current tick
const isPositionInRange = (currentTick: number, tickLower: number, tickUpper: number): boolean => {
    return currentTick >= tickLower && currentTick < tickUpper;
};

export default function PortfolioPage() {
    const { isConnected, address } = useAccount();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'staked' | 'locks' | 'rewards'>('overview');
    const [actionLoading, setActionLoading] = useState(false);

    // Use global pool data for token info, staked positions, AND veNFTs (all prefetched!)
    const {
        getTokenInfo: getGlobalTokenInfo,
        isLoading: globalLoading,
        stakedPositions: prefetchedStakedPositions,
        stakedLoading: loadingStaked,
        refetchStaked,
        removeStakedPosition,
        veNFTs: prefetchedVeNFTs,
        veNFTsLoading: loadingVeNFTs,
        refetchVeNFTs
    } = usePoolData();

    // Use prefetched data from provider
    const stakedPositions = prefetchedStakedPositions;
    const veNFTs = prefetchedVeNFTs;

    // Pull-to-refresh for mobile
    const [isRefreshing, setIsRefreshing] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchStaked(),
                refetchVeNFTs(),
                refetchCL(),
                refetchV2(),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    const { handlers, pullProgress, isPulling } = usePullToRefresh({
        onRefresh: handleRefresh,
        threshold: 80,
    });

    // Shadow outer getTokenInfo - uses global data first, then fallback to utility
    const getTokenInfo = (addr: string) => {
        const globalInfo = getGlobalTokenInfo(addr);
        if (globalInfo) {
            return { symbol: globalInfo.symbol, decimals: globalInfo.decimals };
        }
        // Fallback to centralized utility
        const info = getTokenDisplayInfo(addr);
        return { symbol: info.symbol, decimals: info.decimals };
    };

    // Increase liquidity modal state
    const [showIncreaseLiquidityModal, setShowIncreaseLiquidityModal] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<typeof clPositions[0] | null>(null);
    const [amount0ToAdd, setAmount0ToAdd] = useState('');
    const [amount1ToAdd, setAmount1ToAdd] = useState('');
    const [balance0, setBalance0] = useState<string>('0');
    const [balance1, setBalance1] = useState<string>('0');
    // Raw balances for MAX button (full precision)
    const [rawBalance0, setRawBalance0] = useState<string>('0');
    const [rawBalance1, setRawBalance1] = useState<string>('0');

    // Contract write hook
    const { writeContractAsync } = useWriteContract();
    const { executeBatch, encodeContractCall } = useBatchTransactions();

    // Get CL and V2 positions
    const { positions: clPositions, positionCount: clCount, isLoading: clLoading, refetch: refetchCL } = useCLPositions();
    const { positions: v2Positions, refetch: refetchV2 } = useV2Positions();

    // V2 position management state
    const [expandedV2Position, setExpandedV2Position] = useState<string | null>(null);
    const [v2RemovePercent, setV2RemovePercent] = useState<number>(100);

    // State to store current ticks for each position (keyed by tokenId)
    // NOTE: currentTick is now included in CLPosition from subgraph, use pos.currentTick directly
    const positionTicks: Record<string, number> = {};
    clPositions.forEach(pos => {
        positionTicks[pos.tokenId.toString()] = pos.currentTick;
    });
    const ticksLoading = clLoading;  // Use position loading state

    // Fetch balances and pool price when modal opens
    const [currentTick, setCurrentTick] = useState<number | null>(null);

    useEffect(() => {
        const fetchBalancesAndPrice = async () => {
            if (!address || !selectedPosition || !showIncreaseLiquidityModal) {
                setBalance0('0');
                setBalance1('0');
                setRawBalance0('0');
                setRawBalance1('0');
                setCurrentTick(null);
                return;
            }



            try {
                const balanceSelector = '0x70a08231';
                const addressPadded = address.slice(2).toLowerCase().padStart(64, '0');

                console.log('Fetching for position tokens:', selectedPosition.token0, selectedPosition.token1);

                const [bal0Response, bal1Response] = await Promise.all([
                    fetch(getRpcForPoolData(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{ to: selectedPosition.token0, data: `${balanceSelector}${addressPadded}` }, 'latest'],
                            id: 1,
                        }),
                    }).then(r => r.json()),
                    fetch(getRpcForPoolData(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_call',
                            params: [{ to: selectedPosition.token1, data: `${balanceSelector}${addressPadded}` }, 'latest'],
                            id: 2,
                        }),
                    }).then(r => r.json()),
                ]);

                const t0 = getTokenInfo(selectedPosition.token0);
                const t1 = getTokenInfo(selectedPosition.token1);
                const isToken0WSEI = selectedPosition.token0.toLowerCase() === WSEI.address.toLowerCase();
                const isToken1WSEI = selectedPosition.token1.toLowerCase() === WSEI.address.toLowerCase();

                console.log('Balance responses:', bal0Response, bal1Response);

                // For WSEI, fetch native SEI balance instead
                if (isToken0WSEI) {
                    const nativeBal = await fetch(getRpcForPoolData(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBalance',
                            params: [address, 'latest'],
                            id: 10,
                        }),
                    }).then(r => r.json());
                    if (nativeBal.result) {
                        const nativeWei = BigInt(nativeBal.result);
                        const fullValue = Number(nativeWei) / 1e18;
                        setRawBalance0(fullValue.toString());
                        setBalance0(fullValue.toFixed(6));
                    }
                } else if (bal0Response.result && bal0Response.result !== '0x') {
                    const bal0Wei = BigInt(bal0Response.result);
                    const fullValue = Number(bal0Wei) / (10 ** t0.decimals);
                    setRawBalance0(fullValue.toString());
                    setBalance0(fullValue.toFixed(6));
                }

                if (isToken1WSEI) {
                    const nativeBal = await fetch(getRpcForPoolData(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBalance',
                            params: [address, 'latest'],
                            id: 11,
                        }),
                    }).then(r => r.json());
                    if (nativeBal.result) {
                        const nativeWei = BigInt(nativeBal.result);
                        const fullValue = Number(nativeWei) / 1e18;
                        setRawBalance1(fullValue.toString());
                        setBalance1(fullValue.toFixed(6));
                    }
                } else if (bal1Response.result && bal1Response.result !== '0x') {
                    const bal1Wei = BigInt(bal1Response.result);
                    const fullValue = Number(bal1Wei) / (10 ** t1.decimals);
                    setRawBalance1(fullValue.toString());
                    setBalance1(fullValue.toFixed(6));
                }

                // Use current tick from subgraph position (no RPC slot0 needed)
                setCurrentTick(selectedPosition.currentTick);
            } catch (err) {
                console.error('Error fetching balances:', err);
            }
        };

        fetchBalancesAndPrice();
    }, [address, selectedPosition, showIncreaseLiquidityModal]);

    // Calculate required amount1 based on amount0 input and position tick range
    const calculateAmount1FromAmount0 = (amount0: string): string => {
        // Note: currentTick can be 0 which is valid, so use explicit null check
        if (!selectedPosition || currentTick === null || !amount0 || parseFloat(amount0) === 0) return '';

        const tickLower = selectedPosition.tickLower;
        const tickUpper = selectedPosition.tickUpper;
        const t0 = getTokenInfo(selectedPosition.token0);
        const t1 = getTokenInfo(selectedPosition.token1);

        // For CL, we use the current price to calculate the ratio
        // price = 1.0001^tick (in token1/token0 raw units)
        // Need to adjust for decimals: actual_price = raw_price * 10^(t0.decimals - t1.decimals)
        const rawPrice = Math.pow(1.0001, currentTick);
        const actualPrice = rawPrice * Math.pow(10, t0.decimals - t1.decimals);

        console.log('calculateAmount1FromAmount0:', { currentTick, rawPrice, actualPrice, t0decimals: t0.decimals, t1decimals: t1.decimals });

        if (currentTick < tickLower) {
            // Position is below range, only token0 needed
            return '0';
        } else if (currentTick > tickUpper) {
            // Position is above range, only token1 needed - can't compute from amount0
            return '';
        } else {
            // In range - use simple price conversion
            // amount1 = amount0 * price
            const amount1 = parseFloat(amount0) * actualPrice;
            console.log('Calculated amount1:', amount1);
            return amount1.toFixed(6);
        }
    };

    // Calculate required amount0 based on amount1 input
    const calculateAmount0FromAmount1 = (amount1: string): string => {
        // Note: currentTick can be 0 which is valid, so use explicit null check
        if (!selectedPosition || currentTick === null || !amount1 || parseFloat(amount1) === 0) return '';

        const tickLower = selectedPosition.tickLower;
        const tickUpper = selectedPosition.tickUpper;
        const t0 = getTokenInfo(selectedPosition.token0);
        const t1 = getTokenInfo(selectedPosition.token1);

        // price = 1.0001^tick (in token1/token0 raw units)
        // actual_price = raw_price * 10^(t0.decimals - t1.decimals)
        const rawPrice = Math.pow(1.0001, currentTick);
        const actualPrice = rawPrice * Math.pow(10, t0.decimals - t1.decimals);

        if (currentTick < tickLower) {
            // Only token0 needed - can't compute from amount1
            return '';
        } else if (currentTick > tickUpper) {
            // Only token1 needed
            return '0';
        } else {
            // In range - use simple price conversion
            // amount0 = amount1 / price
            if (actualPrice === 0) return '';
            const amount0 = parseFloat(amount1) / actualPrice;
            return amount0.toFixed(6);
        }
    };

    // Handle amount0 change and auto-calculate amount1
    const handleAmount0Change = (value: string) => {
        setAmount0ToAdd(value);
        const calculated = calculateAmount1FromAmount0(value);
        if (calculated) setAmount1ToAdd(calculated);
    };

    // Handle amount1 change and auto-calculate amount0
    const handleAmount1Change = (value: string) => {
        setAmount1ToAdd(value);
        const calculated = calculateAmount0FromAmount1(value);
        if (calculated) setAmount0ToAdd(calculated);
    };

    // NOTE: VeNFTs are now prefetched by PoolDataProvider - no need to fetch here!
    // Use refetchVeNFTs from usePoolData to refresh veNFT data if needed.

    // NOTE: Staked positions are now prefetched by PoolDataProvider - no need to fetch here!
    // Use refetchStaked from usePoolData to refresh staked positions if needed.

    // Calculate totals
    const totalLockedWind = veNFTs.reduce((sum, nft) => sum + nft.amount, BigInt(0));
    const totalVotingPower = veNFTs.reduce((sum, nft) => sum + nft.votingPower, BigInt(0));
    const totalPendingRewards = stakedPositions.reduce((sum, pos) => sum + pos.pendingRewards, BigInt(0));
    const totalUncollectedFees = clPositions.reduce((sum, pos) => sum + pos.tokensOwed0 + pos.tokensOwed1, BigInt(0));

    // Collect fees from CL position
    const handleCollectFees = async (position: typeof clPositions[0]) => {
        if (!address) return;
        setActionLoading(true);
        try {
            const maxUint128 = BigInt('340282366920938463463374607431768211455');
            await writeContractAsync({
                address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                abi: NFT_POSITION_MANAGER_ABI,
                functionName: 'collect',
                args: [{
                    tokenId: position.tokenId,
                    recipient: address,
                    amount0Max: maxUint128,
                    amount1Max: maxUint128,
                }],
            });
            toast.success('Fees collected!');
            refetchCL();
        } catch (err) {
            console.error('Collect fees error:', err);
            toast.error('Failed to collect fees');
        }
        setActionLoading(false);
    };

    // Remove liquidity from CL position with batch support
    const handleRemoveLiquidity = async (position: typeof clPositions[0]) => {
        if (!address || position.liquidity <= BigInt(0)) return;
        setActionLoading(true);
        try {
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
            const maxUint128 = BigInt('340282366920938463463374607431768211455');

            // Build batch: decrease liquidity + collect
            const batchCalls = [
                encodeContractCall(
                    CL_CONTRACTS.NonfungiblePositionManager as Address,
                    NFT_POSITION_MANAGER_ABI,
                    'decreaseLiquidity',
                    [{
                        tokenId: position.tokenId,
                        liquidity: position.liquidity,
                        amount0Min: BigInt(0),
                        amount1Min: BigInt(0),
                        deadline,
                    }]
                ),
                encodeContractCall(
                    CL_CONTRACTS.NonfungiblePositionManager as Address,
                    NFT_POSITION_MANAGER_ABI,
                    'collect',
                    [{
                        tokenId: position.tokenId,
                        recipient: address,
                        amount0Max: maxUint128,
                        amount1Max: maxUint128,
                    }]
                )
            ];

            // Try batch first
            const batchResult = await executeBatch(batchCalls);

            if (batchResult.usedBatching && batchResult.success) {
                toast.success('Liquidity removed & fees collected in one transaction!');
            } else {
                // Fall back to sequential
                console.log('Batch not available, using sequential remove + collect');

                // Decrease liquidity
                await writeContractAsync({
                    address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                    abi: NFT_POSITION_MANAGER_ABI,
                    functionName: 'decreaseLiquidity',
                    args: [{
                        tokenId: position.tokenId,
                        liquidity: position.liquidity,
                        amount0Min: BigInt(0),
                        amount1Min: BigInt(0),
                        deadline,
                    }],
                });

                // Then collect
                await writeContractAsync({
                    address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                    abi: NFT_POSITION_MANAGER_ABI,
                    functionName: 'collect',
                    args: [{
                        tokenId: position.tokenId,
                        recipient: address,
                        amount0Max: maxUint128,
                        amount1Max: maxUint128,
                    }],
                });

                toast.success('Liquidity removed!');
            }

            refetchCL();
        } catch (err) {
            console.error('Remove liquidity error:', err);
            toast.error('Failed to remove liquidity');
        }
        setActionLoading(false);
    };

    // Stake CL position in gauge
    const handleStakePosition = async (position: typeof clPositions[0]) => {
        if (!address) return;
        setActionLoading(true);
        try {
            // Get gauge address from Goldsky subgraph (no RPC Voter.gauges call)
            const gaugeAddress = await fetchGaugeAddressByPool(position.poolId);
            if (!gaugeAddress) {
                toast.warning('No gauge found for this pool');
                setActionLoading(false);
                return;
            }

            const gaugeAddressLower = gaugeAddress.toLowerCase();

            // Check if NFT is already approved for this gauge
            // getApproved(tokenId) returns the approved address for the token
            const getApprovedSelector = '0x081812fc'; // getApproved(uint256)
            const tokenIdHex = position.tokenId.toString(16).padStart(64, '0');

            const approvedResult = await fetch(getRpcForPoolData(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', method: 'eth_call',
                    params: [{
                        to: CL_CONTRACTS.NonfungiblePositionManager,
                        data: `${getApprovedSelector}${tokenIdHex}`
                    }, 'latest'],
                    id: 1
                })
            }).then(r => r.json());

            const approvedAddress = approvedResult.result ? ('0x' + approvedResult.result.slice(-40)).toLowerCase() : '';
            const needsApproval = approvedAddress !== gaugeAddressLower;

            // Only request approval if not already approved
            if (needsApproval) {
                const approvalTx = await writeContractAsync({
                    address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                    abi: [{ inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'approve', outputs: [], stateMutability: 'nonpayable', type: 'function' }],
                    functionName: 'approve',
                    args: [gaugeAddressLower as Address, position.tokenId],
                });

                // Wait for approval to be confirmed before depositing
                // Poll for tx receipt
                let confirmed = false;
                for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
                    const receipt = await fetch(getRpcForPoolData(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0', method: 'eth_getTransactionReceipt',
                            params: [approvalTx],
                            id: 1
                        })
                    }).then(r => r.json());

                    if (receipt.result && receipt.result.status === '0x1') {
                        confirmed = true;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                if (!confirmed) {
                    toast.error('Approval failed. Try again');
                    setActionLoading(false);
                    return;
                }
            }

            // Deposit to gauge
            await writeContractAsync({
                address: gaugeAddressLower as Address,
                abi: CL_GAUGE_ABI,
                functionName: 'deposit',
                args: [position.tokenId],
            });

            toast.success('Position staked! Earning WIND rewards');
            refetchCL();
        } catch (err) {
            console.error('Stake position error:', err);
            toast.error('Failed to stake position');
        }
        setActionLoading(false);
    };

    // Unstake position from gauge - uses optimistic update, no full reload
    const handleUnstakePosition = async (pos: StakedPosition) => {
        if (!address) return;
        setActionLoading(true);
        try {
            await writeContractAsync({
                address: pos.gaugeAddress as Address,
                abi: CL_GAUGE_ABI,
                functionName: 'withdraw',
                args: [pos.tokenId],
            });

            toast.success('Position unstaked!');
            // Optimistically remove from UI immediately - no loading state!
            removeStakedPosition(pos.tokenId, pos.gaugeAddress);
            // Background refresh of CL positions to reflect the change
            refetchCL();
        } catch (err) {
            console.error('Unstake position error:', err);
            toast.error('Failed to unstake position');
        }
        setActionLoading(false);
    };

    // Claim WIND rewards from gauge
    const handleClaimRewards = async (pos: StakedPosition) => {
        if (!address) return;
        setActionLoading(true);
        try {
            await writeContractAsync({
                address: pos.gaugeAddress as Address,
                abi: CL_GAUGE_ABI,
                functionName: 'getReward',
                args: [pos.tokenId],
            });

            toast.success('Rewards claimed!');
            // Refresh staked positions to show updated rewards
            refetchStaked();
        } catch (err) {
            console.error('Claim rewards error:', err);
            toast.error('Failed to claim rewards');
        }
        setActionLoading(false);
    };

    // Claim all rewards from all staked positions
    const handleClaimAllRewards = async () => {
        if (!address || stakedPositions.length === 0) return;
        setActionLoading(true);
        try {
            // Build batch calls for claiming from all gauges
            const batchCalls = stakedPositions
                .filter(pos => pos.pendingRewards > BigInt(0))
                .map(pos => encodeContractCall(
                    pos.gaugeAddress as Address,
                    CL_GAUGE_ABI,
                    'getReward',
                    [pos.tokenId]
                ));

            if (batchCalls.length === 0) {
                toast.info('No rewards to claim');
                setActionLoading(false);
                return;
            }

            // Try batch first
            const batchResult = await executeBatch(batchCalls);

            if (batchResult.usedBatching && batchResult.success) {
                toast.success(`Claimed rewards from ${batchCalls.length} position(s) in one transaction!`);
            } else {
                // Fall back to sequential
                for (const pos of stakedPositions) {
                    if (pos.pendingRewards > BigInt(0)) {
                        await writeContractAsync({
                            address: pos.gaugeAddress as Address,
                            abi: CL_GAUGE_ABI,
                            functionName: 'getReward',
                            args: [pos.tokenId],
                        });
                    }
                }
                toast.success('All rewards claimed!');
            }
            refetchStaked(); // Refresh staked positions
        } catch (err) {
            console.error('Claim all rewards error:', err);
            toast.error('Failed to claim all rewards');
        }
        setActionLoading(false);
    };

    // Unstake and remove: Unstake (auto-claims) + Decrease + Collect in one transaction
    const handleBatchExitPosition = async (pos: StakedPosition) => {
        if (!address) return;
        setActionLoading(true);
        try {
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
            const maxUint128 = BigInt('340282366920938463463374607431768211455');

            const batchCalls = [];

            // 1. Unstake from gauge FIRST
            batchCalls.push(encodeContractCall(
                pos.gaugeAddress as Address,
                CL_GAUGE_ABI,
                'withdraw',
                [pos.tokenId]
            ));

            // 2. Decrease liquidity (remove all) SECOND
            if (pos.liquidity && pos.liquidity > BigInt(0)) {
                batchCalls.push(encodeContractCall(
                    CL_CONTRACTS.NonfungiblePositionManager as Address,
                    NFT_POSITION_MANAGER_ABI,
                    'decreaseLiquidity',
                    [{
                        tokenId: pos.tokenId,
                        liquidity: pos.liquidity,
                        amount0Min: BigInt(0),
                        amount1Min: BigInt(0),
                        deadline,
                    }]
                ));
            }

            // 3. Collect fees LAST
            batchCalls.push(encodeContractCall(
                CL_CONTRACTS.NonfungiblePositionManager as Address,
                NFT_POSITION_MANAGER_ABI,
                'collect',
                [{
                    tokenId: pos.tokenId,
                    recipient: address,
                    amount0Max: maxUint128,
                    amount1Max: maxUint128,
                }]
            ));
            // Note: Rewards are auto-claimed when unstaking, no separate claim needed

            // Execute batch
            const batchResult = await executeBatch(batchCalls);

            if (batchResult.usedBatching && batchResult.success) {
                const actions = [];
                actions.push('unstaked');
                if (pos.liquidity && pos.liquidity > BigInt(0)) actions.push('removed liquidity');
                actions.push('collected fees');
                // Note: Rewards are auto-claimed when unstaking

                toast.success(`Position exited: ${actions.join(' + ')}!`);
            } else {
                // Fall back to sequential execution
                toast.info('Batch not supported, using sequential transactions...');

                // 1. Unstake FIRST (auto-claims rewards)
                await writeContractAsync({
                    address: pos.gaugeAddress as Address,
                    abi: CL_GAUGE_ABI,
                    functionName: 'withdraw',
                    args: [pos.tokenId],
                });

                // 2. Decrease liquidity SECOND
                if (pos.liquidity && pos.liquidity > BigInt(0)) {
                    await writeContractAsync({
                        address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                        abi: NFT_POSITION_MANAGER_ABI,
                        functionName: 'decreaseLiquidity',
                        args: [{
                            tokenId: pos.tokenId,
                            liquidity: pos.liquidity,
                            amount0Min: BigInt(0),
                            amount1Min: BigInt(0),
                            deadline,
                        }],
                    });
                }

                // 3. Collect fees LAST
                await writeContractAsync({
                    address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                    abi: NFT_POSITION_MANAGER_ABI,
                    functionName: 'collect',
                    args: [{
                        tokenId: pos.tokenId,
                        recipient: address,
                        amount0Max: maxUint128,
                        amount1Max: maxUint128,
                    }],
                });
                // Note: Rewards are auto-claimed when unstaking, no separate claim needed

                toast.success('Position fully exited!');
            }

            // Optimistically remove from UI immediately - no loading state!
            removeStakedPosition(pos.tokenId, pos.gaugeAddress);
            // Background refresh of CL positions to reflect the change
            refetchCL();
        } catch (err) {
            console.error('Unstake and remove error:', err);
            toast.error('Failed to unstake and remove position');
        }
        setActionLoading(false);
    };

    // Remove V2 liquidity with percentage support and batch transactions
    const handleRemoveV2Liquidity = async (pos: typeof v2Positions[0], percent: number) => {
        if (!address || pos.lpBalance <= BigInt(0)) return;
        setActionLoading(true);
        try {
            // Calculate amount to remove based on percentage
            const liquidityToRemove = (pos.lpBalance * BigInt(percent)) / BigInt(100);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

            // Check existing allowance first
            const allowanceSelector = '0xdd62ed3e'; // allowance(address,address)
            const ownerPadded = address.slice(2).toLowerCase().padStart(64, '0');
            const spenderPadded = V2_CONTRACTS.Router.slice(2).toLowerCase().padStart(64, '0');

            const allowanceResult = await fetch(getRpcForPoolData(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', method: 'eth_call',
                    params: [{
                        to: pos.poolAddress,
                        data: `${allowanceSelector}${ownerPadded}${spenderPadded}`
                    }, 'latest'],
                    id: 1
                })
            }).then(r => r.json());

            const currentAllowance = allowanceResult.result ? BigInt(allowanceResult.result) : BigInt(0);
            const needsApproval = currentAllowance < liquidityToRemove;

            // Build remove liquidity call
            const removeLiquidityCall = encodeContractCall(
                V2_CONTRACTS.Router as Address,
                ROUTER_ABI,
                'removeLiquidity',
                [
                    pos.token0 as Address,
                    pos.token1 as Address,
                    pos.stable,
                    liquidityToRemove,
                    BigInt(0), // amountAMin
                    BigInt(0), // amountBMin
                    address,
                    deadline,
                ]
            );

            if (needsApproval) {
                // Build approval call
                const approveCall = encodeContractCall(
                    pos.poolAddress as Address,
                    ERC20_ABI,
                    'approve',
                    [V2_CONTRACTS.Router as Address, liquidityToRemove]
                );

                // Try batch: approve + removeLiquidity
                const batchResult = await executeBatch([approveCall, removeLiquidityCall]);

                if (batchResult.usedBatching && batchResult.success) {
                    toast.success(`Approved & removed ${percent}% liquidity in one transaction!`);
                } else {
                    // Fall back to sequential
                    console.log('Batch not available for V2, using sequential approve + remove');

                    const approvalTx = await writeContractAsync({
                        address: pos.poolAddress as Address,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [V2_CONTRACTS.Router as Address, liquidityToRemove],
                    });

                    // Wait for approval to confirm
                    let confirmed = false;
                    for (let i = 0; i < 30; i++) {
                        const receipt = await fetch(getRpcForPoolData(), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0', method: 'eth_getTransactionReceipt',
                                params: [approvalTx],
                                id: 1
                            })
                        }).then(r => r.json());

                        if (receipt.result && receipt.result.status === '0x1') {
                            confirmed = true;
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    if (!confirmed) {
                        toast.error('Approval failed. Try again');
                        setActionLoading(false);
                        return;
                    }

                    // Then remove liquidity
                    await writeContractAsync({
                        address: V2_CONTRACTS.Router as Address,
                        abi: ROUTER_ABI,
                        functionName: 'removeLiquidity',
                        args: [
                            pos.token0 as Address,
                            pos.token1 as Address,
                            pos.stable,
                            liquidityToRemove,
                            BigInt(0),
                            BigInt(0),
                            address,
                            deadline,
                        ],
                    });

                    toast.success(`Removed ${percent}% liquidity!`);
                }
            } else {
                // No approval needed, just remove liquidity
                await writeContractAsync({
                    address: V2_CONTRACTS.Router as Address,
                    abi: ROUTER_ABI,
                    functionName: 'removeLiquidity',
                    args: [
                        pos.token0 as Address,
                        pos.token1 as Address,
                        pos.stable,
                        liquidityToRemove,
                        BigInt(0),
                        BigInt(0),
                        address,
                        deadline,
                    ],
                });
                toast.success(`Removed ${percent}% liquidity!`);
            }

            refetchV2();
            setExpandedV2Position(null);
        } catch (err) {
            console.error('Remove V2 liquidity error:', err);
            toast.error('Failed to remove liquidity');
        }
        setActionLoading(false);
    };

    // Open increase liquidity modal
    const openIncreaseLiquidityModal = (position: typeof clPositions[0]) => {
        setSelectedPosition(position);
        setAmount0ToAdd('');
        setAmount1ToAdd('');
        setShowIncreaseLiquidityModal(true);
    };

    // Increase liquidity for CL position with batch support
    const handleIncreaseLiquidity = async () => {
        // Prevent multiple submissions
        if (actionLoading) {
            console.log('Action already in progress, skipping');
            return;
        }

        if (!address || !selectedPosition || (!amount0ToAdd && !amount1ToAdd)) return;
        setActionLoading(true);
        try {
            const t0 = getTokenInfo(selectedPosition.token0);
            const t1 = getTokenInfo(selectedPosition.token1);
            const amount0Desired = amount0ToAdd ? BigInt(Math.floor(parseFloat(amount0ToAdd) * (10 ** t0.decimals))) : BigInt(0);
            const amount1Desired = amount1ToAdd ? BigInt(Math.floor(parseFloat(amount1ToAdd) * (10 ** t1.decimals))) : BigInt(0);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

            // Check if either token is WSEI (for native value handling)
            const isToken0WSEI = selectedPosition.token0.toLowerCase() === WSEI.address.toLowerCase();
            const isToken1WSEI = selectedPosition.token1.toLowerCase() === WSEI.address.toLowerCase();

            // Calculate native value if using WSEI
            let nativeValue = BigInt(0);
            if (isToken0WSEI && amount0Desired > BigInt(0)) {
                nativeValue = amount0Desired;
            } else if (isToken1WSEI && amount1Desired > BigInt(0)) {
                nativeValue = amount1Desired;
            }

            // Helper to check allowance
            const checkAllowance = async (tokenAddr: string, amount: bigint): Promise<boolean> => {
                const result = await fetch(getRpcForPoolData(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0', id: 1,
                        method: 'eth_call',
                        params: [{
                            to: tokenAddr,
                            data: `0xdd62ed3e${address!.slice(2).toLowerCase().padStart(64, '0')}${CL_CONTRACTS.NonfungiblePositionManager.slice(2).toLowerCase().padStart(64, '0')}`
                        }, 'latest']
                    })
                }).then(r => r.json());
                const allowance = result.result ? BigInt(result.result) : BigInt(0);
                return allowance >= amount;
            };

            // Determine which tokens need approval
            const needsToken0Approval = amount0Desired > BigInt(0) && !(isToken0WSEI && nativeValue > BigInt(0)) && !(await checkAllowance(selectedPosition.token0, amount0Desired));
            const needsToken1Approval = amount1Desired > BigInt(0) && !(isToken1WSEI && nativeValue > BigInt(0)) && !(await checkAllowance(selectedPosition.token1, amount1Desired));

            // Build batch calls
            const batchCalls = [];

            // Add approval for token0 if needed
            if (needsToken0Approval) {
                batchCalls.push(encodeContractCall(
                    selectedPosition.token0 as Address,
                    ERC20_ABI,
                    'approve',
                    [CL_CONTRACTS.NonfungiblePositionManager as Address, amount0Desired]
                ));
            }

            // Add approval for token1 if needed
            if (needsToken1Approval) {
                batchCalls.push(encodeContractCall(
                    selectedPosition.token1 as Address,
                    ERC20_ABI,
                    'approve',
                    [CL_CONTRACTS.NonfungiblePositionManager as Address, amount1Desired]
                ));
            }

            // Add increaseLiquidity call
            batchCalls.push(encodeContractCall(
                CL_CONTRACTS.NonfungiblePositionManager as Address,
                NFT_POSITION_MANAGER_ABI,
                'increaseLiquidity',
                [{
                    tokenId: selectedPosition.tokenId,
                    amount0Desired,
                    amount1Desired,
                    amount0Min: BigInt(0),
                    amount1Min: BigInt(0),
                    deadline,
                }],
                nativeValue
            ));

            // Try batch first
            const batchResult = await executeBatch(batchCalls);

            if (batchResult.usedBatching && batchResult.success) {
                const actions = [];
                if (needsToken0Approval) actions.push('approved token0');
                if (needsToken1Approval) actions.push('approved token1');
                actions.push('increased liquidity');
                toast.success(`Batch complete: ${actions.join(' + ')}!`);
            } else {
                // Fall back to sequential
                console.log('Batch not available, using sequential transactions');

                // Approve token0 if needed
                if (needsToken0Approval) {
                    const approvalTx = await writeContractAsync({
                        address: selectedPosition.token0 as Address,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [CL_CONTRACTS.NonfungiblePositionManager as Address, amount0Desired],
                    });
                    // Wait briefly
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Approve token1 if needed
                if (needsToken1Approval) {
                    const approvalTx = await writeContractAsync({
                        address: selectedPosition.token1 as Address,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [CL_CONTRACTS.NonfungiblePositionManager as Address, amount1Desired],
                    });
                    // Wait briefly
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Call increaseLiquidity
                await writeContractAsync({
                    address: CL_CONTRACTS.NonfungiblePositionManager as Address,
                    abi: NFT_POSITION_MANAGER_ABI,
                    functionName: 'increaseLiquidity',
                    args: [{
                        tokenId: selectedPosition.tokenId,
                        amount0Desired,
                        amount1Desired,
                        amount0Min: BigInt(0),
                        amount1Min: BigInt(0),
                        deadline,
                    }],
                    value: nativeValue,
                });

                toast.success('Liquidity increased!');
            }

            setShowIncreaseLiquidityModal(false);
            setSelectedPosition(null);
            refetchCL();
        } catch (err) {
            console.error('Increase liquidity error:', err);
            toast.error('Failed to increase liquidity');
        }
        setActionLoading(false);
    };

    if (!isConnected) {
        return (
            <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
                <div className="glass-card max-w-md mx-auto p-8 md:p-12 text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl">👛</span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold mb-2">Connect Wallet</h2>
                    <p className="text-sm md:text-base text-gray-400">Connect your wallet to view your portfolio</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-3 sm:px-6 py-4">
            {/* Header - Compact inline */}
            <motion.div
                className="flex items-center justify-between gap-3 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold">
                        <span className="gradient-text">Portfolio</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400">
                        {clPositions.length + v2Positions.length} positions · {veNFTs.length} locks
                    </p>
                </div>
                {totalPendingRewards > BigInt(0) && (
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Claimable</div>
                        <div className="text-sm sm:text-base font-bold text-green-400">
                            {parseFloat(formatUnits(totalPendingRewards, 18)).toFixed(2)} WIND
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Tabs - Compact */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
                {(['overview', 'positions', 'staked', 'locks', 'rewards'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${activeTab === tab
                            ? 'bg-primary text-white'
                            : 'text-gray-400 hover:text-white bg-white/5'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Pull to Refresh Indicator */}
            <div className="md:hidden flex justify-center items-center h-0 overflow-visible relative z-10">
                <motion.div
                    className="absolute -top-6"
                    style={{
                        opacity: isPulling ? Math.min(pullProgress * 2, 1) : 0,
                        transform: `translateY(${Math.min(pullProgress * 40, 40)}px)`,
                    }}
                >
                    <div className={`w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}>
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                </motion.div>
            </div>

            {/* Scrollable Content with Pull-to-Refresh */}
            <div
                ref={scrollContainerRef}
                className="md:overflow-visible"
                {...handlers}
                style={{
                    transform: isPulling ? `translateY(${pullProgress * 40}px)` : undefined,
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {/* Overview Tab - Compact summary */}
                {activeTab === 'overview' && (
                    <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="glass-card p-3">
                                <div className="text-[10px] text-gray-400">LP Positions</div>
                                <div className="text-lg font-bold gradient-text">{clPositions.length + v2Positions.length}</div>
                                <div className="text-[10px] text-gray-500">{clPositions.length} CL · {v2Positions.length} V2</div>
                            </div>
                            <div className="glass-card p-3">
                                <div className="text-[10px] text-gray-400">Staked</div>
                                <div className="text-lg font-bold text-yellow-400">{stakedPositions.length}</div>
                                <div className="text-[10px] text-gray-500">earning rewards</div>
                            </div>
                            <div className="glass-card p-3">
                                <div className="text-[10px] text-gray-400">Locked WIND</div>
                                <div className="text-lg font-bold text-primary">
                                    {parseFloat(formatUnits(totalLockedWind, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-[10px] text-gray-500">{veNFTs.length} veNFT{veNFTs.length !== 1 ? 's' : ''}</div>
                            </div>
                            <div className="glass-card p-3">
                                <div className="text-[10px] text-gray-400">Claimable</div>
                                <div className="text-lg font-bold text-green-400">
                                    {parseFloat(formatUnits(totalPendingRewards, 18)).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-gray-500">WIND rewards</div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {totalPendingRewards > BigInt(0) && (
                            <button
                                onClick={handleClaimAllRewards}
                                disabled={actionLoading}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white disabled:opacity-50"
                            >
                                {actionLoading ? 'Claiming...' : `Claim ${parseFloat(formatUnits(totalPendingRewards, 18)).toFixed(4)} WIND`}
                            </button>
                        )}

                        {/* Recent Positions Preview */}
                        {clPositions.length > 0 && (
                            <div className="glass-card p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Recent Positions</span>
                                    <button onClick={() => setActiveTab('positions')} className="text-[10px] text-primary">View All →</button>
                                </div>
                                <div className="space-y-1.5">
                                    {clPositions.slice(0, 3).map((pos, i) => {
                                        const t0 = getTokenInfo(pos.token0);
                                        const t1 = getTokenInfo(pos.token1);
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
                                                <span className="font-medium">{t0.symbol}/{t1.symbol}</span>
                                                <span className="text-gray-400">#{pos.tokenId.toString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Staked Positions Preview */}
                        {stakedPositions.length > 0 && (
                            <div className="glass-card p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Staked Positions</span>
                                    <button onClick={() => setActiveTab('staked')} className="text-[10px] text-primary">View All →</button>
                                </div>
                                <div className="space-y-1.5">
                                    {stakedPositions.slice(0, 3).map((pos, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded bg-yellow-500/10 text-xs">
                                            <span className="font-medium">{pos.token0Symbol}/{pos.token1Symbol}</span>
                                            <span className="text-green-400">{parseFloat(formatUnits(pos.pendingRewards, 18)).toFixed(4)} WIND</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Locks Preview */}
                        {veNFTs.length > 0 && (
                            <div className="glass-card p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Your Locks</span>
                                    <button onClick={() => setActiveTab('locks')} className="text-[10px] text-primary">View All →</button>
                                </div>
                                <div className="space-y-1.5">
                                    {veNFTs.slice(0, 2).map((nft, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
                                            <span className="font-medium">veNFT #{nft.tokenId.toString()}</span>
                                            <span className="text-primary">{parseFloat(formatUnits(nft.votingPower, 18)).toFixed(0)} veWIND</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}


                {/* Positions Tab */}
                {activeTab === 'positions' && (
                    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-4">All LP Positions</h3>

                            {/* CL Positions */}
                            {clPositions.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm text-gray-400 mb-3">Concentrated Liquidity (V3)</h4>
                                    <div className="space-y-3">
                                        {clPositions.map((pos, i) => {
                                            const t0 = getTokenInfo(pos.token0);
                                            const t1 = getTokenInfo(pos.token1);
                                            const feeMap: Record<number, string> = { 1: '0.005%', 10: '0.05%', 50: '0.02%', 80: '0.30%', 100: '0.045%', 200: '0.25%', 2000: '1%' };
                                            return (
                                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative w-12 h-7 flex-shrink-0">
                                                                {getTokenLogo(pos.token0) ? (
                                                                    <img src={getTokenLogo(pos.token0)} alt={t0.symbol} className="absolute left-0 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                                ) : (
                                                                    <div className="absolute left-0 w-7 h-7 rounded-full bg-secondary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">{t0.symbol.slice(0, 2)}</div>
                                                                )}
                                                                {getTokenLogo(pos.token1) ? (
                                                                    <img src={getTokenLogo(pos.token1)} alt={t1.symbol} className="absolute left-4 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                                ) : (
                                                                    <div className="absolute left-4 w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">{t1.symbol.slice(0, 2)}</div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-sm truncate">{t0.symbol}/{t1.symbol}</div>
                                                                <div className="text-[10px] text-gray-400">#{pos.tokenId.toString()} · {feeMap[pos.tickSpacing] || `${pos.tickSpacing}ts`}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">CL</span>
                                                    </div>

                                                    {/* Stake to Earn Banner - for unstaked positions */}
                                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 mb-2">
                                                        <span className="text-lg"></span>
                                                        <div className="flex-1">
                                                            <div className="text-xs font-medium text-green-400">Earning trading fees!</div>
                                                            <div className="text-[10px] text-gray-400">Already earning more than DragonSwap • Stake for extra WIND rewards</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleStakePosition(pos)}
                                                            disabled={actionLoading}
                                                            className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition disabled:opacity-50"
                                                        >
                                                            Stake Now
                                                        </button>
                                                    </div>
                                                    {/* Token Balances */}
                                                    {(() => {
                                                        const currentPoolTick = positionTicks[pos.tokenId.toString()];
                                                        const hasTickData = currentPoolTick !== undefined;
                                                        const inRange = hasTickData && isPositionInRange(currentPoolTick, pos.tickLower, pos.tickUpper);
                                                        const amounts = hasTickData
                                                            ? calculateTokenAmounts(pos.liquidity, pos.tickLower, pos.tickUpper, currentPoolTick, t0.decimals, t1.decimals)
                                                            : { amount0: 0, amount1: 0 };

                                                        // Calculate prices from ticks
                                                        const priceLower = tickToPrice(pos.tickLower, t0.decimals, t1.decimals);
                                                        const priceUpper = tickToPrice(pos.tickUpper, t0.decimals, t1.decimals);
                                                        const currentPrice = hasTickData ? tickToPrice(currentPoolTick, t0.decimals, t1.decimals) : null;

                                                        return (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                    <div className="p-2 rounded-lg bg-white/5">
                                                                        <div className="text-[10px] text-gray-400 mb-0.5">{t0.symbol} Balance</div>
                                                                        <div className="font-medium text-sm">
                                                                            {hasTickData ? amounts.amount0.toFixed(amounts.amount0 < 0.01 ? 6 : 4) : <span className="text-gray-500">Loading...</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-2 rounded-lg bg-white/5">
                                                                        <div className="text-[10px] text-gray-400 mb-0.5">{t1.symbol} Balance</div>
                                                                        <div className="font-medium text-sm">
                                                                            {hasTickData ? amounts.amount1.toFixed(amounts.amount1 < 0.01 ? 6 : 4) : <span className="text-gray-500">Loading...</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Price Range */}
                                                                <div className="p-2 rounded-lg bg-white/5 mb-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[10px] text-gray-400">Price Range ({t1.symbol}/{t0.symbol})</span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isExtremeTickRange(pos.tickLower, pos.tickUpper) ? 'bg-purple-500/20 text-purple-400' :
                                                                            !hasTickData ? 'bg-gray-500/20 text-gray-400' :
                                                                                inRange ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                                            }`}>
                                                                            {isExtremeTickRange(pos.tickLower, pos.tickUpper) ? 'Full Range' :
                                                                                !hasTickData ? 'Loading' : inRange ? 'In Range' : 'Out of Range'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        {isExtremeTickRange(pos.tickLower, pos.tickUpper) ? (
                                                                            <span className="font-medium text-purple-300">0 to max (covers all prices)</span>
                                                                        ) : (
                                                                            <>
                                                                                <span className="font-medium">{formatPrice(priceLower)}</span>
                                                                                <span className="text-gray-500">→</span>
                                                                                <span className="font-medium">{formatPrice(priceUpper)}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {currentPrice !== null && !isExtremeTickRange(pos.tickLower, pos.tickUpper) && (
                                                                        <div className="text-[10px] text-gray-400 mt-1">
                                                                            Current: {formatPrice(currentPrice)}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Uncollected Fees */}
                                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400">Uncollected {t0.symbol}</div>
                                                                        <div className="font-medium text-green-400">
                                                                            {parseFloat(formatUnits(pos.tokensOwed0, t0.decimals)).toFixed(6)}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400">Uncollected {t1.symbol}</div>
                                                                        <div className="font-medium text-green-400">
                                                                            {parseFloat(formatUnits(pos.tokensOwed1, t1.decimals)).toFixed(6)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    {/* Action Buttons - 2x2 grid on mobile, row on larger screens */}
                                                    <div className="grid grid-cols-2 sm:flex gap-2 mt-4 pt-3 border-t border-white/10">
                                                        <button
                                                            onClick={() => openIncreaseLiquidityModal(pos)}
                                                            disabled={actionLoading}
                                                            className="sm:flex-1 py-2.5 px-3 text-xs font-medium rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition disabled:opacity-50"
                                                        >
                                                            {actionLoading ? '...' : 'Increase'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCollectFees(pos)}
                                                            disabled={actionLoading || (pos.tokensOwed0 <= BigInt(0) && pos.tokensOwed1 <= BigInt(0))}
                                                            className="sm:flex-1 py-2.5 px-3 text-xs font-medium rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition disabled:opacity-50"
                                                        >
                                                            {actionLoading ? '...' : 'Collect'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveLiquidity(pos)}
                                                            disabled={actionLoading || pos.liquidity <= BigInt(0)}
                                                            className="sm:flex-1 py-2.5 px-3 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                        >
                                                            {actionLoading ? '...' : 'Remove'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStakePosition(pos)}
                                                            disabled={actionLoading}
                                                            className="sm:flex-1 py-2.5 px-3 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
                                                        >
                                                            {actionLoading ? '...' : 'Stake'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* V2 Positions */}
                            {v2Positions.length > 0 && (
                                <div>
                                    <h4 className="text-sm text-gray-400 mb-3">V2 Pools</h4>
                                    <div className="space-y-3">
                                        {v2Positions.map((pos, i) => {
                                            const t0 = getTokenInfo(pos.token0);
                                            const t1 = getTokenInfo(pos.token1);
                                            const logo0 = getTokenLogo(pos.token0);
                                            const logo1 = getTokenLogo(pos.token1);
                                            const isExpanded = expandedV2Position === pos.poolAddress;

                                            return (
                                                <div key={i} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                                    {/* Clickable Header */}
                                                    <button
                                                        onClick={() => setExpandedV2Position(isExpanded ? null : pos.poolAddress)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Token pair logos */}
                                                            <div className="relative w-12 h-7 flex-shrink-0">
                                                                {logo0 ? (
                                                                    <img src={logo0} alt={t0.symbol} className="absolute left-0 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                                ) : (
                                                                    <div className="absolute left-0 w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">
                                                                        {t0.symbol.slice(0, 2)}
                                                                    </div>
                                                                )}
                                                                {logo1 ? (
                                                                    <img src={logo1} alt={t1.symbol} className="absolute left-4 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                                ) : (
                                                                    <div className="absolute left-4 w-7 h-7 rounded-full bg-secondary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">
                                                                        {t1.symbol.slice(0, 2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="font-semibold">{t0.symbol}/{t1.symbol}</div>
                                                                <div className="text-xs text-gray-400">
                                                                    {pos.stable ? 'Stable' : 'Volatile'} • {parseFloat(formatUnits(pos.lpBalance, 18)).toFixed(6)} LP
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">V2</span>
                                                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </button>

                                                    {/* Expanded Actions */}
                                                    {isExpanded && (
                                                        <div className="px-4 pb-4 border-t border-white/10">
                                                            {/* Remove Liquidity Section */}
                                                            <div className="mt-3">
                                                                <div className="text-xs text-gray-400 mb-2">Withdraw Liquidity</div>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    <button
                                                                        onClick={() => handleRemoveV2Liquidity(pos, 25)}
                                                                        disabled={actionLoading}
                                                                        className="py-2.5 px-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                                    >
                                                                        {actionLoading ? '...' : '25%'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveV2Liquidity(pos, 50)}
                                                                        disabled={actionLoading}
                                                                        className="py-2.5 px-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                                    >
                                                                        {actionLoading ? '...' : '50%'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveV2Liquidity(pos, 75)}
                                                                        disabled={actionLoading}
                                                                        className="py-2.5 px-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                                    >
                                                                        {actionLoading ? '...' : '75%'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveV2Liquidity(pos, 100)}
                                                                        disabled={actionLoading}
                                                                        className="py-2.5 px-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                                    >
                                                                        {actionLoading ? '...' : 'MAX'}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Info note */}
                                                            <div className="mt-3 text-xs text-gray-500 text-center">
                                                                V2 pools are deprecated unless you're trading tax tokens.
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {clPositions.length === 0 && v2Positions.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-400 mb-4">No LP positions found</p>
                                    <Link href="/pools" className="btn-primary px-6 py-2 rounded-lg">Add Liquidity</Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Staked Tab */}
                {activeTab === 'staked' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Staked Positions List */}
                        <div className="glass-card p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm">Your Staked NFTs</h3>
                                {stakedPositions.length > 0 && (
                                    <span className="text-xs text-green-400">
                                        {parseFloat(formatUnits(totalPendingRewards, 18)).toFixed(4)} WIND pending
                                    </span>
                                )}
                            </div>
                            {loadingStaked ? (
                                <div className="text-center py-8 text-gray-400">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : stakedPositions.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 text-sm mb-3">No staked positions</p>
                                    <Link href="/pools" className="btn-primary px-4 py-2 text-sm rounded-lg">Stake LP</Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {stakedPositions.map((pos, i) => {
                                        const feeMap: Record<number, string> = { 1: '0.005%', 10: '0.05%', 50: '0.02%', 80: '0.30%', 100: '0.045%', 200: '0.25%', 2000: '1%' };

                                        return (
                                            <div key={i} className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative w-12 h-7 flex-shrink-0">
                                                            {getTokenLogo(pos.token0) ? (
                                                                <img src={getTokenLogo(pos.token0)} alt={pos.token0Symbol} className="absolute left-0 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                            ) : (
                                                                <div className="absolute left-0 w-7 h-7 rounded-full bg-secondary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">
                                                                    {pos.token0Symbol.slice(0, 2)}
                                                                </div>
                                                            )}
                                                            {getTokenLogo(pos.token1) ? (
                                                                <img src={getTokenLogo(pos.token1)} alt={pos.token1Symbol} className="absolute left-4 w-7 h-7 rounded-full border border-[var(--bg-primary)]" />
                                                            ) : (
                                                                <div className="absolute left-4 w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold border border-[var(--bg-primary)]">
                                                                    {pos.token1Symbol.slice(0, 2)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-sm truncate">{pos.token0Symbol}/{pos.token1Symbol}</div>
                                                            <div className="text-[10px] text-gray-400">
                                                                #{pos.tokenId.toString()} · {feeMap[pos.tickSpacing] || `${pos.tickSpacing}ts`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                                                        Staked
                                                    </span>
                                                </div>

                                                {/* Token Amounts */}
                                                {(() => {
                                                    const amounts = calculateTokenAmounts(
                                                        pos.liquidity,
                                                        pos.tickLower,
                                                        pos.tickUpper,
                                                        pos.currentTick,
                                                        pos.token0Decimals,
                                                        pos.token1Decimals
                                                    );
                                                    const inRange = pos.currentTick >= pos.tickLower && pos.currentTick < pos.tickUpper;

                                                    return (
                                                        <div className="text-xs mb-2 px-1 space-y-1">
                                                            {/* Token balances */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="p-1.5 rounded bg-white/5">
                                                                    <div className="text-[9px] text-gray-400">{pos.token0Symbol}</div>
                                                                    <div className="font-medium text-sm">
                                                                        {amounts.amount0.toFixed(amounts.amount0 < 0.01 ? 6 : 2)}
                                                                    </div>
                                                                </div>
                                                                <div className="p-1.5 rounded bg-white/5">
                                                                    <div className="text-[9px] text-gray-400">{pos.token1Symbol}</div>
                                                                    <div className="font-medium text-sm">
                                                                        {amounts.amount1.toFixed(amounts.amount1 < 0.01 ? 6 : 2)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Range status */}
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-400">Range:</span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isFullRangePosition(pos.tickLower, pos.tickUpper)
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : inRange
                                                                        ? 'bg-green-500/20 text-green-400'
                                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>
                                                                    {isFullRangePosition(pos.tickLower, pos.tickUpper)
                                                                        ? 'Full Range'
                                                                        : inRange
                                                                            ? 'In Range'
                                                                            : 'Out of Range'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Pending rewards */}
                                                <div className="text-xs mb-2 px-1">
                                                    <span className="text-green-400 font-medium">
                                                        {parseFloat(formatUnits(pos.pendingRewards, 18)).toFixed(4)} WIND pending
                                                    </span>
                                                </div>


                                                {/* Action Buttons - Compact */}
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleClaimRewards(pos)}
                                                        disabled={actionLoading || pos.pendingRewards <= BigInt(0)}
                                                        className="flex-1 py-1.5 text-[10px] rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50 font-medium"
                                                    >
                                                        Claim
                                                    </button>
                                                    <button
                                                        onClick={() => handleUnstakePosition(pos)}
                                                        disabled={actionLoading}
                                                        className="flex-1 py-1.5 text-[10px] rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition disabled:opacity-50 font-medium"
                                                    >
                                                        Unstake
                                                    </button>
                                                    <button
                                                        onClick={() => handleBatchExitPosition(pos)}
                                                        disabled={actionLoading}
                                                        className="flex-1 py-1.5 text-[10px] rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 font-medium"
                                                        title="Unstake (auto-claims rewards), remove liquidity & collect fees"
                                                    >
                                                        Unstake & Remove
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Locks Tab */}
                {activeTab === 'locks' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="glass-card p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm">Your veNFT Locks</h3>
                                <Link href="/vote" className="text-[10px] text-primary font-medium">
                                    Lock More →
                                </Link>
                            </div>
                            {loadingVeNFTs ? (
                                <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
                            ) : veNFTs.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-400 text-sm mb-3">No WIND locked yet</p>
                                    <Link href="/vote" className="btn-primary px-4 py-2 text-xs rounded-lg">Lock WIND</Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {veNFTs.map((nft, i) => {
                                        const lockEndDate = new Date(Number(nft.end) * 1000);
                                        const isExpired = !nft.isPermanent && Number(nft.end) < Date.now() / 1000;
                                        return (
                                            <div key={i} className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-semibold text-sm">veNFT #{nft.tokenId.toString()}</div>
                                                    {nft.isPermanent && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">Permanent</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className="text-gray-400">Locked: </span>
                                                        <span className="font-medium">{parseFloat(formatUnits(nft.amount, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} WIND</span>
                                                    </div>
                                                    <div className="text-primary font-medium">
                                                        {parseFloat(formatUnits(nft.votingPower, 18)).toFixed(0)} veWIND
                                                    </div>
                                                </div>
                                                {!nft.isPermanent && (
                                                    <div className="text-[10px] text-gray-400 mt-1">
                                                        {isExpired ? (
                                                            <span className="text-yellow-400">Unlocked - go to Vote page to withdraw</span>
                                                        ) : (
                                                            <>Unlocks {lockEndDate.toLocaleDateString()}</>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Manage on Vote Page */}
                                    <Link
                                        href="/vote"
                                        className="block w-full py-2 text-center text-xs text-primary hover:bg-primary/10 rounded-lg transition"
                                    >
                                        Manage Locks on Vote Page →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="glass-card p-3 sm:p-4">
                            {/* Header with Claim All */}
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-green-400">
                                        {parseFloat(formatUnits(totalPendingRewards, 18)).toFixed(4)} WIND
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                        From {stakedPositions.length} position{stakedPositions.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={handleClaimAllRewards}
                                    disabled={actionLoading || totalPendingRewards <= BigInt(0)}
                                    className="px-3 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white disabled:opacity-50"
                                >
                                    {actionLoading ? '...' : 'Claim All'}
                                </button>
                            </div>

                            {/* Rewards List */}
                            {loadingStaked ? (
                                <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
                            ) : stakedPositions.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-400 text-sm mb-2">No staked positions</p>
                                    <Link href="/pools" className="btn-primary px-4 py-2 text-xs rounded-lg">Stake LP</Link>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {stakedPositions.map((pos, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">{pos.token0Symbol}/{pos.token1Symbol}</div>
                                                <div className="text-[10px] text-gray-400">#{pos.tokenId.toString()}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-green-400">
                                                    {parseFloat(formatUnits(pos.pendingRewards, 18)).toFixed(4)}
                                                </span>
                                                <button
                                                    onClick={() => handleClaimRewards(pos)}
                                                    disabled={actionLoading || pos.pendingRewards <= BigInt(0)}
                                                    className="px-2 py-1 text-[10px] rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50"
                                                >
                                                    Claim
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Increase Liquidity Modal - Compact Mobile Style */}
                {showIncreaseLiquidityModal && selectedPosition && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div
                            className="w-full sm:max-w-md bg-[#0d0d14] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto"
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-[#0d0d14] z-10 px-4 py-3 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold">Increase Liquidity</h3>
                                    <button
                                        onClick={() => setShowIncreaseLiquidityModal(false)}
                                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                                    >✕</button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Position Info - Compact */}
                                <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="relative w-8 h-5 flex-shrink-0">
                                                {getTokenLogo(selectedPosition.token0) ? (
                                                    <img src={getTokenLogo(selectedPosition.token0)} alt={getTokenInfo(selectedPosition.token0).symbol} className="absolute left-0 w-5 h-5 rounded-full border border-[var(--bg-primary)]" />
                                                ) : (
                                                    <div className="absolute left-0 w-5 h-5 rounded-full bg-secondary/30 flex items-center justify-center text-[8px] font-bold border border-[var(--bg-primary)]">
                                                        {getTokenInfo(selectedPosition.token0).symbol.slice(0, 2)}
                                                    </div>
                                                )}
                                                {getTokenLogo(selectedPosition.token1) ? (
                                                    <img src={getTokenLogo(selectedPosition.token1)} alt={getTokenInfo(selectedPosition.token1).symbol} className="absolute left-3 w-5 h-5 rounded-full border border-[var(--bg-primary)]" />
                                                ) : (
                                                    <div className="absolute left-3 w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold border border-[var(--bg-primary)]">
                                                        {getTokenInfo(selectedPosition.token1).symbol.slice(0, 2)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-semibold text-xs truncate">
                                                {getTokenInfo(selectedPosition.token0).symbol}/{getTokenInfo(selectedPosition.token1).symbol}
                                            </span>
                                            <span className="text-[10px] text-gray-400">#{selectedPosition.tokenId.toString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Token Inputs - Compact */}
                                <div className="space-y-0.5">
                                    {/* Token 0 */}
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-gray-400">
                                                {selectedPosition.token0.toLowerCase() === WSEI.address.toLowerCase() ? 'SEI' : getTokenInfo(selectedPosition.token0).symbol}
                                            </label>
                                            <span className="text-[10px] text-gray-400">
                                                Bal: {balance0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={amount0ToAdd}
                                                onChange={(e) => handleAmount0Change(e.target.value)}
                                                placeholder="0.0"
                                                className="flex-1 min-w-0 bg-transparent text-xl font-bold outline-none placeholder-gray-600"
                                            />
                                            <div className="flex items-center gap-1.5 py-1.5 px-2 bg-white/10 rounded-lg flex-shrink-0">
                                                {getTokenLogo(selectedPosition.token0) ? (
                                                    <img src={getTokenLogo(selectedPosition.token0)} alt={getTokenInfo(selectedPosition.token0).symbol} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-secondary/30 flex items-center justify-center text-[10px] font-bold">
                                                        {getTokenInfo(selectedPosition.token0).symbol.slice(0, 2)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-sm">{getTokenInfo(selectedPosition.token0).symbol}</span>
                                            </div>
                                        </div>
                                        {/* Quick percentage buttons */}
                                        {rawBalance0 && parseFloat(rawBalance0) > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {[25, 50, 75, 100].map(pct => (
                                                    <button
                                                        key={pct}
                                                        onClick={() => handleAmount0Change((parseFloat(rawBalance0) * pct / 100).toString())}
                                                        className="flex-1 py-1 text-[10px] font-medium rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        {pct === 100 ? 'MAX' : `${pct}%`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Token 1 */}
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-gray-400">
                                                {selectedPosition.token1.toLowerCase() === WSEI.address.toLowerCase() ? 'SEI' : getTokenInfo(selectedPosition.token1).symbol} (auto)
                                            </label>
                                            <span className="text-[10px] text-gray-400">
                                                Bal: {balance1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={amount1ToAdd}
                                                placeholder="Auto-calculated"
                                                className="flex-1 min-w-0 bg-transparent text-xl font-bold outline-none placeholder-gray-600 text-gray-400"
                                                readOnly
                                            />
                                            <div className="flex items-center gap-1.5 py-1.5 px-2 bg-white/10 rounded-lg flex-shrink-0">
                                                {getTokenLogo(selectedPosition.token1) ? (
                                                    <img src={getTokenLogo(selectedPosition.token1)} alt={getTokenInfo(selectedPosition.token1).symbol} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold">
                                                        {getTokenInfo(selectedPosition.token1).symbol.slice(0, 2)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-sm">{getTokenInfo(selectedPosition.token1).symbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-[#0d0d14] p-4 pt-2 border-t border-white/10">
                                <button
                                    onClick={handleIncreaseLiquidity}
                                    disabled={actionLoading || (!amount0ToAdd && !amount1ToAdd)}
                                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${!actionLoading && (amount0ToAdd || amount1ToAdd)
                                        ? 'bg-gradient-to-r from-primary via-purple-500 to-secondary text-white shadow-primary/30 hover:shadow-2xl active:scale-[0.98]'
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {actionLoading ? (
                                        <span className="flex items-center justify-center gap-3">
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Adding...
                                        </span>
                                    ) : (!amount0ToAdd && !amount1ToAdd) ? (
                                        'Enter Amount'
                                    ) : (
                                        'Add Liquidity'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}

