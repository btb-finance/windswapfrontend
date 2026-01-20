'use client';

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';
import { BTB_CONTRACTS } from '@/config/contracts';
import { ERC20_ABI, BTBB_TOKEN_ABI, BEAR_NFT_ABI, BEAR_STAKING_ABI } from '@/config/abis';
import { ethereum } from '@/config/chains';

// ============================================
// BTB Token Hooks
// ============================================

export function useBTBBalance(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BTB as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useBTBAllowance(owner: `0x${string}` | undefined, spender: `0x${string}`) {
    return useReadContract({
        address: BTB_CONTRACTS.BTB as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: owner ? [owner, spender] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!owner,
        },
    });
}

// ============================================
// BTBB Token Hooks
// ============================================

export function useBTBBBalance(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BTBB as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useBTBBStats() {
    return useReadContract({
        address: BTB_CONTRACTS.BTBB as `0x${string}`,
        abi: BTBB_TOKEN_ABI,
        functionName: 'getStats',
        chainId: ethereum.id,
    });
}

export function useBTBBPendingFees() {
    return useReadContract({
        address: BTB_CONTRACTS.BTBB as `0x${string}`,
        abi: BTBB_TOKEN_ABI,
        functionName: 'pendingFees',
        chainId: ethereum.id,
    });
}

// ============================================
// Bear NFT Hooks
// ============================================

export function useBearNFTBalance(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useBearNFTPrice() {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'pricePerNFT',
        chainId: ethereum.id,
    });
}

export function useBearNFTTotalMinted() {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'totalMinted',
        chainId: ethereum.id,
    });
}

export function useBearNFTMaxSupply() {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'MAX_SUPPLY',
        chainId: ethereum.id,
    });
}

export function useBearNFTRemainingSupply() {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'remainingSupply',
        chainId: ethereum.id,
    });
}

export function useUserNFTTokenIds(address: `0x${string}` | undefined) {
    const { data: balance } = useBearNFTBalance(address);

    // We'll need to fetch token IDs individually
    // This is a simplified version - for many tokens, you'd want pagination
    const tokenIds: bigint[] = [];

    return {
        data: tokenIds,
        balance: balance,
    };
}

// ============================================
// Bear Staking Hooks
// ============================================

export function useStakingStats() {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'getStats',
        chainId: ethereum.id,
    });
}

export function useUserStakingInfo(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'getUserInfo',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useUserStakedCount(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'stakedCountOf',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function usePendingRewards(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'pendingRewards',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function usePendingRewardsDetailed(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'pendingRewardsDetailed',
        args: address ? [address] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useStakingAPR() {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'estimatedAPR',
        chainId: ethereum.id,
    });
}

export function useTotalStaked() {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'totalStaked',
        chainId: ethereum.id,
    });
}

export function useTotalRewardsDistributed() {
    return useReadContract({
        address: BTB_CONTRACTS.BearStaking as `0x${string}`,
        abi: BEAR_STAKING_ABI,
        functionName: 'totalRewardsDistributed',
        chainId: ethereum.id,
    });
}

// ============================================
// Write Hooks
// ============================================

export function useBTBApprove() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approve = (spender: `0x${string}`, amount: bigint) => {
        writeContract({
            address: BTB_CONTRACTS.BTB as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, amount],
            chainId: ethereum.id,
        });
    };

    return { approve, isPending, isConfirming, isSuccess, error, hash };
}

export function useBTBBMint() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const mint = (amount: bigint) => {
        writeContract({
            address: BTB_CONTRACTS.BTBB as `0x${string}`,
            abi: BTBB_TOKEN_ABI,
            functionName: 'mint',
            args: [amount],
            chainId: ethereum.id,
        });
    };

    return { mint, isPending, isConfirming, isSuccess, error, hash };
}

export function useBTBBRedeem() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const redeem = (amount: bigint) => {
        writeContract({
            address: BTB_CONTRACTS.BTBB as `0x${string}`,
            abi: BTBB_TOKEN_ABI,
            functionName: 'redeem',
            args: [amount],
            chainId: ethereum.id,
        });
    };

    return { redeem, isPending, isConfirming, isSuccess, error, hash };
}

export function useBearNFTMint() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const buyNFT = (amount: number, pricePerNFT: bigint) => {
        const totalPrice = pricePerNFT * BigInt(amount);
        writeContract({
            address: BTB_CONTRACTS.BearNFT as `0x${string}`,
            abi: BEAR_NFT_ABI,
            functionName: 'buyNFT',
            args: [BigInt(amount)],
            value: totalPrice,
            chainId: ethereum.id,
        });
    };

    return { buyNFT, isPending, isConfirming, isSuccess, error, hash };
}

export function useNFTApproveForStaking() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approveAll = () => {
        writeContract({
            address: BTB_CONTRACTS.BearNFT as `0x${string}`,
            abi: BEAR_NFT_ABI,
            functionName: 'setApprovalForAll',
            args: [BTB_CONTRACTS.BearStaking as `0x${string}`, true],
            chainId: ethereum.id,
        });
    };

    return { approveAll, isPending, isConfirming, isSuccess, error, hash };
}

export function useIsApprovedForStaking(address: `0x${string}` | undefined) {
    return useReadContract({
        address: BTB_CONTRACTS.BearNFT as `0x${string}`,
        abi: BEAR_NFT_ABI,
        functionName: 'isApprovedForAll',
        args: address ? [address, BTB_CONTRACTS.BearStaking as `0x${string}`] : undefined,
        chainId: ethereum.id,
        query: {
            enabled: !!address,
        },
    });
}

export function useStakeNFTs() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const stake = (tokenIds: bigint[]) => {
        writeContract({
            address: BTB_CONTRACTS.BearStaking as `0x${string}`,
            abi: BEAR_STAKING_ABI,
            functionName: 'stake',
            args: [tokenIds],
            chainId: ethereum.id,
        });
    };

    return { stake, isPending, isConfirming, isSuccess, error, hash };
}

export function useUnstakeNFTs() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const unstake = (count: number) => {
        writeContract({
            address: BTB_CONTRACTS.BearStaking as `0x${string}`,
            abi: BEAR_STAKING_ABI,
            functionName: 'unstake',
            args: [BigInt(count)],
            chainId: ethereum.id,
        });
    };

    return { unstake, isPending, isConfirming, isSuccess, error, hash };
}

export function useClaimRewards() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const claim = () => {
        writeContract({
            address: BTB_CONTRACTS.BearStaking as `0x${string}`,
            abi: BEAR_STAKING_ABI,
            functionName: 'claim',
            chainId: ethereum.id,
        });
    };

    return { claim, isPending, isConfirming, isSuccess, error, hash };
}

export function useCollectFees() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const collectFees = () => {
        writeContract({
            address: BTB_CONTRACTS.BearStaking as `0x${string}`,
            abi: BEAR_STAKING_ABI,
            functionName: 'collectFees',
            chainId: ethereum.id,
        });
    };

    return { collectFees, isPending, isConfirming, isSuccess, error, hash };
}
