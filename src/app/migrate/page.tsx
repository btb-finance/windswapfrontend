'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useMigration } from '@/hooks/useMigration';
import { useToast } from '@/providers/ToastProvider';

function MigrateIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

interface VeNFTCardProps {
    tokenId: bigint;
    amount: bigint;
    end: bigint;
    isPermanent: boolean;
    isBeingMigrated: boolean;
    migrateStep: 'reset' | 'approve' | 'migrate' | null;
    alreadyMigrated: boolean;
    onMigrate: (tokenId: bigint) => void;
}

const STEP_LABEL: Record<string, string> = {
    reset: 'Resetting votes…',
    approve: 'Approving…',
    migrate: 'Migrating…',
};

function VeNFTCard({ tokenId, amount, end, isPermanent, isBeingMigrated, migrateStep, alreadyMigrated, onMigrate }: VeNFTCardProps) {
    const [fee, setFee] = useState<bigint | null>(null);
    const { quoteFee } = useMigration();

    useEffect(() => {
        if (!alreadyMigrated) {
            quoteFee(tokenId).then(setFee).catch(() => {});
        }
    }, [tokenId, alreadyMigrated, quoteFee]);

    const endDate = isPermanent ? 'Permanent' : new Date(Number(end) * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 rounded-2xl border transition-all duration-200 ${
                alreadyMigrated
                    ? 'border-green-500/30 bg-green-500/5 opacity-60'
                    : isBeingMigrated
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-white/10 hover:border-primary/30'
            }`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Token ID badge */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">#{tokenId.toString()}</span>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                                {Number(formatEther(amount)).toLocaleString('en-US', { maximumFractionDigits: 4 })} WIND
                            </span>
                            {isPermanent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Perm
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">Unlock: {endDate}</div>
                        {fee !== null && !alreadyMigrated && (
                            <div className="text-xs text-white/40 mt-0.5">
                                Fee ≈ {Number(formatEther(fee)).toFixed(4)} SEI
                            </div>
                        )}
                    </div>
                </div>

                {/* Action button */}
                <div className="shrink-0">
                    {alreadyMigrated ? (
                        <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                            <CheckIcon className="w-4 h-4" />
                            <span>Migrated</span>
                        </div>
                    ) : isBeingMigrated ? (
                        <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
                            <SpinnerIcon className="w-4 h-4" />
                            <span>{migrateStep ? STEP_LABEL[migrateStep] : 'Migrating…'}</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onMigrate(tokenId)}
                            className="btn-gradient px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <MigrateIcon className="w-4 h-4" />
                            Migrate
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function MigratePage() {
    const { isConnected } = useAccount();
    const { veNFTs, veNFTsLoading, migrationOpen, migratingTokenId, migrateStep, error, migrate, isMigrated } = useMigration();
    const { success, error: toastError, info } = useToast();
    const [migratedIds, setMigratedIds] = useState<Set<string>>(new Set());

    // Check which tokenIds have already been migrated
    useEffect(() => {
        if (veNFTs.length === 0) return;
        const checkAll = async () => {
            const results = await Promise.all(
                veNFTs.map(async (nft) => {
                    const done = await isMigrated(nft.tokenId);
                    return done ? nft.tokenId.toString() : null;
                })
            );
            setMigratedIds(new Set(results.filter(Boolean) as string[]));
        };
        checkAll();
    }, [veNFTs, isMigrated]);

    const handleMigrate = useCallback(async (tokenId: bigint) => {
        info(`Migrating veNFT #${tokenId}…`);
        const txHash = await migrate(tokenId);
        if (txHash) {
            success(`veNFT #${tokenId} migrated! Tx: ${txHash.slice(0, 10)}…`);
            setMigratedIds((prev) => new Set([...prev, tokenId.toString()]));
        } else {
            toastError(error ?? 'Migration failed');
        }
    }, [migrate, success, toastError, info, error]);

    const pendingCount = veNFTs.filter((n) => !migratedIds.has(n.tokenId.toString())).length;

    return (
        <div className="min-h-screen pt-28 pb-16 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                        <MigrateIcon className="w-4 h-4" />
                        SEI → Base Migration
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
                        Migrate Your veNFTs
                    </h1>
                    <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
                        Wind Swap is moving to Base. Migrate your locked WIND positions — you&apos;ll receive an equivalent max-locked veNFT on Base.
                    </p>
                </motion.div>

                {/* How it works */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-card rounded-2xl border border-white/10 p-5 mb-6"
                >
                    <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">How it works</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { step: '1', title: 'Approve', desc: 'Approve the migration contract for your veNFT' },
                            { step: '2', title: 'Send', desc: 'Your veNFT is locked in SEI; a Hyperlane message is sent to Base' },
                            { step: '3', title: 'Receive', desc: 'You get a max-locked veNFT with the same WIND amount on Base' },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="text-center">
                                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm mx-auto mb-2">
                                    {step}
                                </div>
                                <div className="text-white text-xs font-semibold mb-1">{title}</div>
                                <div className="text-white/40 text-[11px] leading-snug">{desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chain visual */}
                    <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#c0392b]/20 border border-[#c0392b]/30 flex items-center justify-center text-[10px] font-bold text-[#e74c3c]">S</div>
                            <span className="text-sm font-medium text-white/70">SEI</span>
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-primary" />
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0052FF]/20 border border-[#0052FF]/30 flex items-center justify-center text-[10px] font-bold text-[#0052FF]">B</div>
                            <span className="text-sm font-medium text-white/70">Base</span>
                        </div>
                    </div>
                </motion.div>

                {/* Status banner */}
                <AnimatePresence>
                    {!migrationOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            Migration window is currently closed.
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* veNFT list */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card rounded-2xl border border-white/10 p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">Your veNFTs</h2>
                        {pendingCount > 0 && migrationOpen && (
                            <span className="text-xs text-white/50">{pendingCount} pending</span>
                        )}
                    </div>

                    {!isConnected ? (
                        <div className="text-center py-12 text-white/40">
                            <MigrateIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Connect your wallet to see your veNFTs</p>
                        </div>
                    ) : veNFTsLoading ? (
                        <div className="text-center py-12">
                            <SpinnerIcon className="w-8 h-8 mx-auto text-primary" />
                            <p className="text-sm text-white/40 mt-3">Loading your veNFTs…</p>
                        </div>
                    ) : veNFTs.length === 0 ? (
                        <div className="text-center py-12 text-white/40">
                            <MigrateIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No veNFTs found in this wallet</p>
                            <a
                                href="https://windswap.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-3 text-primary text-sm hover:underline"
                            >
                                Check Base instead <ArrowRightIcon className="w-3 h-3" />
                            </a>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <AnimatePresence>
                                {veNFTs.map((nft) => (
                                    <VeNFTCard
                                        key={nft.tokenId.toString()}
                                        tokenId={nft.tokenId}
                                        amount={nft.amount}
                                        end={nft.end}
                                        isPermanent={nft.isPermanent}
                                        isBeingMigrated={migratingTokenId === nft.tokenId}
                                    migrateStep={migratingTokenId === nft.tokenId ? migrateStep : null}
                                        alreadyMigrated={migratedIds.has(nft.tokenId.toString())}
                                        onMigrate={migrationOpen ? handleMigrate : () => {}}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* Link to Base */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 text-center"
                >
                    <p className="text-white/40 text-sm mb-2">After migration, check your veNFTs on Base:</p>
                    <a
                        href="https://windswap.org/vote"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary font-medium hover:underline text-sm"
                    >
                        windswap.org/vote <ArrowRightIcon className="w-4 h-4" />
                    </a>
                </motion.div>

            </div>
        </div>
    );
}
