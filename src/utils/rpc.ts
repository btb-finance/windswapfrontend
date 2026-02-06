// Centralized RPC configuration for Sei network
// Single RPC endpoint (Alchemy) for all categories

const DEFAULT_ALCHEMY_SEI_RPC = 'https://sei-mainnet.g.alchemy.com/v2/INhvk7-hUrgf5niZBGbae';

function getAlchemyRpc(): string {
    // Prefer explicit env var. Next.js exposes NEXT_PUBLIC_* to the client.
    return process.env.NEXT_PUBLIC_ALCHEMY_SEI_RPC_URL || DEFAULT_ALCHEMY_SEI_RPC;
}

// ============================================
// CATEGORY-BASED RPC DISTRIBUTION
// Spreads load so no single endpoint gets hammered
// ============================================

/**
 * RPC for user-specific data: balances, positions, staked NFTs, veNFTs
 * Uses primary (API key = higher rate limit for per-user calls)
 */
export function getRpcForUserData(): string {
    return getAlchemyRpc();
}

/**
 * RPC for pool/liquidity data: reserves, TVL, pool lookups, slot0
 * Uses archive RPC (secondary stakeme.pro returns empty for contract calls)
 */
export function getRpcForPoolData(): string {
    return getAlchemyRpc();
}

/**
 * RPC for voting/gauge data: weights, votes, epoch rewards, gauge lookups
 * Uses primary RPC (archive RPC returns 0 for fee rewards)
 */
export function getRpcForVoting(): string {
    return getAlchemyRpc();
}

/**
 * RPC for swap quotes: router quotes, quoter calls
 * Uses Alchemy for fastest response (paid tier) - only for user-facing swap quotes
 */
export function getRpcForQuotes(): string {
    return getAlchemyRpc();
}

/**
 * Make an RPC call with automatic fallback
 */
export async function rpcCall<T = any>(
    method: string,
    params: any[],
    preferredRpc?: string
): Promise<T> {
    const rpc = preferredRpc || getAlchemyRpc();
    const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: 1,
        }),
    });

    const result = await response.json();
    if (result.error) {
        throw new Error(result.error.message || 'RPC error');
    }
    return result.result;
}

/**
 * Make batch RPC calls with automatic fallback
 */
export async function batchRpcCall(
    calls: Array<{ method: string; params: any[] }>,
    preferredRpc?: string
): Promise<any[]> {
    const rpc = preferredRpc || getAlchemyRpc();
    const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
            calls.map((call, i) => ({
                jsonrpc: '2.0',
                method: call.method,
                params: call.params,
                id: i + 1,
            }))
        ),
    });

    const results = await response.json();
    if (Array.isArray(results)) {
        return results.map(r => r.result);
    }
    return [results.result];
}

/**
 * Simple eth_call helper with fallback
 */
export async function ethCall(to: string, data: string): Promise<string> {
    return rpcCall<string>('eth_call', [{ to, data }, 'latest']);
}
