'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { motion } from 'framer-motion';
import {
    useBearNFTPrice,
    useBearNFTTotalMinted,
    useBearNFTMaxSupply,
    useBearNFTRemainingSupply,
    useBearNFTMint,
    useBearNFTBalance,
} from '@/hooks/useBTBContracts';
import { ethereum } from '@/config/chains';

export function BearNFTMint() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isOnEthereum = chainId === ethereum.id;

    const [quantity, setQuantity] = useState(1);

    // NFT Contract Data
    const { data: pricePerNFT } = useBearNFTPrice();
    const { data: totalMinted } = useBearNFTTotalMinted();
    const { data: maxSupply } = useBearNFTMaxSupply();
    const { data: remainingSupply } = useBearNFTRemainingSupply();
    const { data: userNFTBalance, refetch: refetchBalance } = useBearNFTBalance(address);

    // ETH Balance
    const { data: ethBalance } = useBalance({
        address,
        chainId: ethereum.id,
    });

    // Mint Transaction
    const { buyNFT, isPending, isSuccess } = useBearNFTMint();

    // Calculate total price
    const totalPrice = pricePerNFT ? pricePerNFT * BigInt(quantity) : BigInt(0);
    const hasEnoughETH = ethBalance && ethBalance.value >= totalPrice;

    // Refetch on success
    useEffect(() => {
        if (isSuccess) {
            refetchBalance();
            setQuantity(1);
        }
    }, [isSuccess]);

    const handleMint = () => {
        if (pricePerNFT) {
            buyNFT(quantity, pricePerNFT);
        }
    };

    const incrementQuantity = () => {
        const maxBuy = remainingSupply ? Math.min(Number(remainingSupply), 10) : 10;
        if (quantity < maxBuy) {
            setQuantity(q => q + 1);
        }
    };

    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity(q => q - 1);
        }
    };

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4">Bear NFT Mint</h2>
                <p className="text-white/60">Connect wallet to mint Bear NFTs</p>
            </motion.div>
        );
    }

    if (!isOnEthereum) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-2xl"
            >
                <h2 className="text-xl font-bold mb-4">Bear NFT Mint</h2>
                <p className="text-white/60 mb-4">Switch to Ethereum to mint Bear NFTs</p>
                <button
                    onClick={() => switchChain({ chainId: ethereum.id })}
                    className="btn-primary px-6 py-2 rounded-xl font-medium"
                >
                    Switch to Ethereum
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 sm:p-4 rounded-2xl"
        >
            <h2 className="text-xl font-bold mb-6">🐻 Bear NFT Mint</h2>

            {/* NFT Preview */}
            <div className="relative mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-500/20 aspect-square max-w-[200px] mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">🐻</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2 text-center">
                    <p className="text-white/80 text-sm font-medium">BTB Bear NFT</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs mb-1">Price</p>
                    <p className="text-lg font-bold text-white">
                        {pricePerNFT ? formatEther(pricePerNFT) : '0.01'} ETH
                    </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs mb-1">Minted</p>
                    <p className="text-lg font-bold text-white">
                        {totalMinted?.toString() || '0'} / {maxSupply?.toString() || '100,000'}
                    </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs mb-1">Remaining</p>
                    <p className="text-lg font-bold text-amber-400">
                        {remainingSupply?.toLocaleString() || '...'}
                    </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs mb-1">You Own</p>
                    <p className="text-lg font-bold text-purple-400">
                        {userNFTBalance?.toString() || '0'}
                    </p>
                </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-sm">Quantity</span>
                    <span className="text-white/50 text-sm">
                        Max: {remainingSupply ? Math.min(Number(remainingSupply), 10) : 10}
                    </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-12 h-12 rounded-xl bg-white/10 text-white text-2xl font-bold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        −
                    </button>
                    <span className="text-3xl font-bold text-white w-16 text-center">
                        {quantity}
                    </span>
                    <button
                        onClick={incrementQuantity}
                        disabled={quantity >= (remainingSupply ? Math.min(Number(remainingSupply), 10) : 10)}
                        className="w-12 h-12 rounded-xl bg-white/10 text-white text-2xl font-bold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Total Price */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 mb-6 border border-amber-500/20">
                <div className="flex justify-between items-center">
                    <span className="text-white/70">Total Price</span>
                    <span className="text-2xl font-bold text-white">
                        {totalPrice ? formatEther(totalPrice) : '0'} ETH
                    </span>
                </div>
                <div className="text-right text-white/50 text-sm">
                    Your balance: {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH
                </div>
            </div>

            {/* Mint Button */}
            <button
                onClick={handleMint}
                disabled={isPending || !hasEnoughETH || !pricePerNFT}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isPending || !hasEnoughETH || !pricePerNFT
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/20'
                    }`}
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Minting...
                    </span>
                ) : !hasEnoughETH ? (
                    'Insufficient ETH'
                ) : (
                    `Mint ${quantity} Bear NFT${quantity > 1 ? 's' : ''}`
                )}
            </button>

            {/* Info */}
            <p className="text-white/40 text-sm text-center mt-4">
                Stake Bear NFTs to earn BTBB rewards from the 1% transfer tax
            </p>
        </motion.div>
    );
}
