// Centralized RPC configuration for Sei network
// Single RPC endpoint (Alchemy) for all categories

const DEFAULT_ALCHEMY_SEI_RPC = 'https://sei-evm-rpc.publicnode.com';

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
export async function rpcCall<T = unknown>(
    method: string,
    params: unknown[],
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

    const text = await response.text();
    let result: { error?: { message?: string }; result: T };
    try {
        result = JSON.parse(text) as typeof result;
    } catch {
        const ct = response.headers.get('content-type') || '';
        const snippet = text.slice(0, 200);
        throw new Error(`RPC returned non-JSON response (status=${response.status}, content-type=${ct}): ${snippet}`);
    }
    if (result.error) {
        throw new Error(result.error.message || 'RPC error');
    }
    return result.result;
}

/**
 * Make batch RPC calls with automatic fallback
 */
export async function batchRpcCall(
    calls: Array<{ method: string; params: unknown[] }>,
    preferredRpc?: string
): Promise<unknown[]> {
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

    const text = await response.text();
    let results: Array<{ result: unknown }> | { result: unknown };
    try {
        results = JSON.parse(text) as typeof results;
    } catch {
        const ct = response.headers.get('content-type') || '';
        const snippet = text.slice(0, 200);
        throw new Error(`RPC batch returned non-JSON response (status=${response.status}, content-type=${ct}): ${snippet}`);
    }
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
