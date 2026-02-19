'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { sei } from '@/config/chains';
import { useToast } from '@/providers/ToastProvider';
import {
    useCurrentRound,
    useCurrentRoundId,
    useTimeRemaining,
    useMinerStats,
    useTotalClaimableBalance,
    useMinerRoundData,
    useMotherloadePots,
    useDeployToSquares,
    useFinalizeRound,
    useClaimAll,
} from '@/hooks/useLOREmining';

const MOTHERLODE_TIER_NAMES = [
    'Bronze Nugget',
    'Silver Nugget',
    'Gold Nugget',
    'Platinum Nugget',
    'Diamond Nugget',
    'Emerald Vein',
    'Ruby Vein',
    'Sapphire Vein',
    'Crystal Cache',
    'MOTHERLODE',
];

const MOTHERLODE_TIER_COLORS = [
    'text-amber-600',
    'text-gray-400',
    'text-yellow-400',
    'text-cyan-300',
    'text-blue-400',
    'text-emerald-400',
    'text-red-400',
    'text-blue-600',
    'text-purple-300',
    'text-yellow-300',
];

const MOTHERLODE_TIER_BG = [
    'bg-amber-600/10',
    'bg-gray-400/10',
    'bg-yellow-400/10',
    'bg-cyan-300/10',
    'bg-blue-400/10',
    'bg-emerald-400/10',
    'bg-red-400/10',
    'bg-blue-600/10',
    'bg-purple-300/10',
    'bg-yellow-300/10',
];

function formatSEI(wei: bigint | undefined): string {
    if (!wei) return '0';
    const eth = Number(formatEther(wei));
    if (eth >= 1000) return eth.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (eth >= 1) return eth.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return eth.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatLORE(wei: bigint | undefined): string {
    if (!wei) return '0';
    const val = Number(formatEther(wei));
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (val >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function useCountdown(endTimestamp: number) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        const update = () => {
            const diff = endTimestamp - Math.floor(Date.now() / 1000);
            setRemaining(Math.max(0, diff));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [endTimestamp]);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return { remaining, display: `${mins}:${secs.toString().padStart(2, '0')}` };
}

export default function MiningPage() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnSei = chainId === sei.id;
    const { success, error: showError } = useToast();

    const [selectedSquares, setSelectedSquares] = useState<number[]>([]);
    const [amountInput, setAmountInput] = useState('1');
    const [activeTab, setActiveTab] = useState<'game' | 'rewards' | 'pots'>('game');

    // Contract reads
    const { data: round, refetch: refetchRound } = useCurrentRound();
    const { data: roundId } = useCurrentRoundId();
    const { data: minerStats } = useMinerStats(address);
    const { data: claimable, refetch: refetchClaimable } = useTotalClaimableBalance(address);
    const { data: minerRoundData, refetch: refetchMinerRound } = useMinerRoundData(roundId, address);
    const { data: pots } = useMotherloadePots();

    // Contract writes
    const { deploy, isPending: isDeploying, isSuccess: deploySuccess } = useDeployToSquares();
    const { finalize, isPending: isFinalizing, isSuccess: finalizeSuccess } = useFinalizeRound();
    const { claim, isPending: isClaiming, isSuccess: claimSuccess } = useClaimAll();

    // Countdown
    const endTime = round ? Number(round.endTime) : 0;
    const { display: countdown, remaining: timeLeft } = useCountdown(endTime);

    const canFinalize = round && timeLeft === 0 && !round.finalized;

    // Refetch on success
    useEffect(() => {
        if (deploySuccess || finalizeSuccess || claimSuccess) {
            refetchRound();
            refetchClaimable();
            refetchMinerRound();
            setSelectedSquares([]);
        }
    }, [deploySuccess, finalizeSuccess, claimSuccess]);

    const toggleSquare = (i: number) => {
        if (selectedSquares.includes(i)) {
            setSelectedSquares(prev => prev.filter(s => s !== i));
        } else {
            setSelectedSquares(prev => [...prev, i]);
        }
    };

    const handleDeploy = async () => {
        if (!isConnected || !isOnSei || selectedSquares.length === 0) return;
        const amount = parseEther(amountInput || '1');
        try {
            await deploy(selectedSquares, amount);
        } catch (err: any) {
            showError(err?.shortMessage || err?.message || 'Deploy failed');
        }
    };

    const handleFinalize = async () => {
        try {
            await finalize();
            success('Round finalized!');
        } catch (err: any) {
            showError(err?.shortMessage || err?.message || 'Finalize failed');
        }
    };

    const handleClaimAll = async () => {
        try {
            await claim();
        } catch (err: any) {
            showError(err?.shortMessage || err?.message || 'Claim failed');
        }
    };

    const getSquareAmount = (i: number): bigint => {
        return round?.deployed[i] ?? BigInt(0);
    };

    const getSquareMinerCount = (i: number): bigint => {
        return round?.minerCount[i] ?? BigInt(0);
    };

    const mySquareDeployment = (i: number): bigint => {
        return minerRoundData?.deployed[i] ?? BigInt(0);
    };

    const isWinningSquare = (i: number): boolean => {
        return round?.finalized === true && round.winningSquare === i;
    };

    const totalDeployed = round?.totalDeployed ?? BigInt(0);
    const isJackpot = round?.isJackpotRound ?? false;
    const loreReward = round?.loreReward ?? BigInt(0);

    const totalClaimableSei = claimable ? claimable[0] : BigInt(0);
    const totalClaimableLore = claimable ? claimable[1] : BigInt(0);
    const hasClaimable = totalClaimableSei > BigInt(0) || totalClaimableLore > BigInt(0);

    const amountPerSquare = parseEther(amountInput || '0');
    const totalCost = amountPerSquare * BigInt(selectedSquares.length);

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold gradient-text">LORE Mining</h1>
                    {isJackpot && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 animate-pulse">
                            JACKPOT ROUND
                        </span>
                    )}
                </div>
                <p className="text-sm text-foreground/60">
                    Deploy SEI to squares. Winners take the pot + earn LORE.
                </p>
            </div>

            {/* Chain Warning */}
            {isConnected && !isOnSei && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card mb-4 border border-yellow-500/30 bg-yellow-500/5"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-400">Switch to Sei to play</span>
                        <button
                            onClick={() => switchChain({ chainId: sei.id })}
                            className="btn-primary text-sm py-1 px-3"
                        >
                            Switch to Sei
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Round Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="card text-center">
                    <div className="text-xs text-foreground/50 mb-1">Round</div>
                    <div className="text-lg font-bold">#{roundId?.toString() ?? '...'}</div>
                </div>
                <div className="card text-center">
                    <div className="text-xs text-foreground/50 mb-1">
                        {round?.timerStarted ? 'Time Left' : 'Waiting'}
                    </div>
                    <div className={`text-lg font-bold font-mono ${timeLeft <= 10 && round?.timerStarted ? 'text-red-400' : 'text-primary'}`}>
                        {round?.timerStarted ? countdown : '--:--'}
                    </div>
                </div>
                <div className="card text-center">
                    <div className="text-xs text-foreground/50 mb-1">Total Pot</div>
                    <div className="text-lg font-bold">{formatSEI(totalDeployed)} SEI</div>
                </div>
                <div className="card text-center">
                    <div className="text-xs text-foreground/50 mb-1">LORE Reward</div>
                    <div className="text-lg font-bold text-yellow-400">{formatLORE(loreReward)}</div>
                </div>
            </div>

            {/* Finalize Banner */}
            <AnimatePresence>
                {canFinalize && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="card mb-4 border border-primary/30 bg-primary/5 flex items-center justify-between"
                    >
                        <span className="text-sm font-medium">Round expired — finalize to reveal winner!</span>
                        <button
                            onClick={handleFinalize}
                            disabled={isFinalizing}
                            className="btn-primary text-sm py-1 px-4"
                        >
                            {isFinalizing ? 'Finalizing...' : 'Finalize Round'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {(['game', 'rewards', 'pots'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                            activeTab === tab
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'text-foreground/50 hover:text-foreground hover:bg-surface/50'
                        }`}
                    >
                        {tab}
                        {tab === 'rewards' && hasClaimable && (
                            <span className="ml-1.5 w-2 h-2 bg-green-400 rounded-full inline-block" />
                        )}
                    </button>
                ))}
            </div>

            {/* Game Tab */}
            {activeTab === 'game' && (
                <div className="space-y-4">
                    {/* Grid */}
                    <div className="card">
                        <div className="text-sm font-medium mb-3 text-foreground/70">
                            5×5 Grid — Click squares to deploy
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 25 }, (_, i) => {
                                const squareAmount = getSquareAmount(i);
                                const minerCount = getSquareMinerCount(i);
                                const myAmount = mySquareDeployment(i);
                                const isSelected = selectedSquares.includes(i);
                                const isWinner = isWinningSquare(i);
                                const hasMyDeployment = myAmount > BigInt(0);
                                const percentage = totalDeployed > BigInt(0)
                                    ? Number((squareAmount * BigInt(100)) / totalDeployed)
                                    : 0;

                                return (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleSquare(i)}
                                        disabled={hasMyDeployment || round?.finalized}
                                        className={`
                                            relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                                            text-xs font-medium transition-all overflow-hidden
                                            ${isWinner
                                                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                                : isSelected
                                                ? 'border-blue-400 bg-blue-500/40 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/60'
                                                : hasMyDeployment
                                                ? 'border-green-500 bg-green-500/10 text-green-400'
                                                : squareAmount > BigInt(0)
                                                ? 'border-foreground/20 bg-surface/50 text-foreground/70'
                                                : 'border-foreground/10 bg-surface/20 text-foreground/30 hover:border-primary/50'
                                            }
                                        `}
                                    >
                                        {/* Heat bar */}
                                        {percentage > 0 && (
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-primary/20"
                                                style={{ height: `${Math.min(percentage, 100)}%` }}
                                            />
                                        )}
                                        <span className="relative z-10 text-[10px] leading-tight">{i + 1}</span>
                                        {squareAmount > BigInt(0) && (
                                            <span className="relative z-10 text-[9px] leading-tight opacity-70">
                                                {formatSEI(squareAmount)}
                                            </span>
                                        )}
                                        {minerCount > BigInt(0) && (
                                            <span className="relative z-10 text-[8px] opacity-50">{minerCount.toString()}m</span>
                                        )}
                                        {isSelected && (
                                            <span className="absolute top-0.5 right-0.5 text-[10px] text-blue-300">✓</span>
                                        )}
                                        {isWinner && (
                                            <span className="absolute top-0.5 right-0.5 text-[8px]">★</span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 mt-3 text-xs text-foreground/50">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-500/40 inline-block" /> Selected</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-green-500 inline-block" /> My deploy</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-yellow-400 inline-block" /> Winner</span>
                        </div>
                    </div>

                    {/* Deploy Controls */}
                    {!round?.finalized && (
                        <div className="card space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-foreground/50 mb-1 block">SEI per square (min 1)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={amountInput}
                                            onChange={e => setAmountInput(e.target.value)}
                                            min="1"
                                            step="1"
                                            className="input flex-1 text-right"
                                            placeholder="1"
                                        />
                                        <span className="text-sm text-foreground/60">SEI</span>
                                    </div>
                                </div>
                            </div>

                            {selectedSquares.length > 0 && (
                                <div className="text-sm text-foreground/60">
                                    {selectedSquares.length} square{selectedSquares.length > 1 ? 's' : ''} selected
                                    {' — '}total: <span className="font-bold text-foreground">{formatSEI(totalCost)} SEI</span>
                                </div>
                            )}

                            {!isConnected ? (
                                <div className="text-sm text-foreground/50 text-center py-2">Connect wallet to play</div>
                            ) : !isOnSei ? (
                                <button
                                    onClick={() => switchChain({ chainId: sei.id })}
                                    className="btn-primary w-full"
                                >
                                    Switch to Sei
                                </button>
                            ) : (
                                <button
                                    onClick={handleDeploy}
                                    disabled={isDeploying || selectedSquares.length === 0 || !amountInput || parseFloat(amountInput) < 1}
                                    className="btn-primary w-full"
                                >
                                    {isDeploying
                                        ? 'Deploying...'
                                        : selectedSquares.length === 0
                                        ? 'Select squares to deploy'
                                        : `Deploy ${formatSEI(totalCost)} SEI`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Round Finalized Result */}
                    {round?.finalized && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card border border-yellow-400/30 bg-yellow-400/5 text-center space-y-2"
                        >
                            <div className="text-yellow-400 font-bold">Round Finalized</div>
                            <div className="text-2xl font-bold">
                                Square {Number(round.winningSquare) + 1} wins!
                            </div>
                            <div className="text-sm text-foreground/60">
                                Winners split {formatSEI(round.totalWinnings)} SEI + {formatLORE(round.loreReward)} LORE
                            </div>
                            {round.totalMotherlodeReward > BigInt(0) && (
                                <div className="text-sm text-yellow-400">
                                    + Motherlode bonus: {formatLORE(round.totalMotherlodeReward)} LORE
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <div className="space-y-4">
                    <div className="card">
                        <div className="text-sm font-medium mb-4">Your Rewards</div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="rounded-lg bg-surface/50 p-3">
                                <div className="text-xs text-foreground/50 mb-1">Claimable SEI</div>
                                <div className="text-xl font-bold">{formatSEI(totalClaimableSei)}</div>
                                <div className="text-xs text-foreground/40">SEI</div>
                            </div>
                            <div className="rounded-lg bg-surface/50 p-3">
                                <div className="text-xs text-foreground/50 mb-1">Claimable LORE</div>
                                <div className="text-xl font-bold text-yellow-400">{formatLORE(totalClaimableLore)}</div>
                                <div className="text-xs text-foreground/40">LORE</div>
                            </div>
                        </div>

                        {minerStats && (
                            <div className="text-xs text-foreground/50 space-y-1 mb-4">
                                <div className="flex justify-between">
                                    <span>Unclaimed SEI</span>
                                    <span>{formatSEI(minerStats[0])}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Unclaimed LORE</span>
                                    <span>{formatLORE(minerStats[1])}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Refined LORE (from fees)</span>
                                    <span className="text-yellow-400">{formatLORE(minerStats[2])}</span>
                                </div>
                            </div>
                        )}

                        {!isConnected ? (
                            <div className="text-sm text-foreground/50 text-center py-2">Connect wallet to view rewards</div>
                        ) : !isOnSei ? (
                            <button onClick={() => switchChain({ chainId: sei.id })} className="btn-primary w-full">
                                Switch to Sei
                            </button>
                        ) : (
                            <button
                                onClick={handleClaimAll}
                                disabled={isClaiming || !hasClaimable}
                                className="btn-primary w-full"
                            >
                                {isClaiming ? 'Claiming...' : hasClaimable ? 'Claim All Rewards' : 'No rewards to claim'}
                            </button>
                        )}
                    </div>

                    <div className="card text-xs text-foreground/50 space-y-1">
                        <div className="font-medium text-foreground/70 mb-2">How rewards work</div>
                        <div>• Winners receive their original SEI back + proportional share of losing squares</div>
                        <div>• All players on winning square split the LORE reward proportionally</div>
                        <div>• Claiming LORE has a 10% fee redistributed to other LORE holders</div>
                        <div>• Rewards accumulate automatically across rounds</div>
                    </div>
                </div>
            )}

            {/* Motherlode Pots Tab */}
            {activeTab === 'pots' && (
                <div className="space-y-3">
                    <div className="card">
                        <div className="text-sm font-medium mb-3">Motherlode Pots</div>
                        <p className="text-xs text-foreground/50 mb-4">
                            Each round, all pots grow. Winners have a random chance to hit a tier and claim the pot.
                            Higher tiers are rarer but worth more LORE.
                        </p>
                        <div className="space-y-2">
                            {MOTHERLODE_TIER_NAMES.map((name, i) => {
                                const pot = pots ? pots[i] : BigInt(0);
                                const probabilities = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${MOTHERLODE_TIER_BG[i]}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${MOTHERLODE_TIER_COLORS[i]}`}>{name}</span>
                                            <span className="text-xs text-foreground/40">1 in {probabilities[i]}</span>
                                        </div>
                                        <span className={`text-sm font-bold ${MOTHERLODE_TIER_COLORS[i]}`}>
                                            {formatLORE(pot)} LORE
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer info */}
            <div className="mt-6 text-xs text-foreground/30 text-center">
                Contract: 0x88888A11ef184e35D2A1098A5abe8b30312e4f54 · Sei Mainnet
            </div>
        </div>
    );
}
