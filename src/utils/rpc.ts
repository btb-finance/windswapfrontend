// Centralized RPC configuration for Sei network
// Multiple RPC endpoints distributed by call category to avoid overloading any single endpoint

export const RPC_ENDPOINTS = {
    // Primary RPC with API key (high rate limit) - for user-specific data
    primary: 'https://evm-rpc.sei-apis.com/?x-apikey=f9e3e8c8',
    // Secondary RPC - for pool/liquidity data
    secondary: 'https://sei-evm-rpc.stakeme.pro',
    // Archive RPC - for voting/gauge heavy reads
    archive: 'https://sei-archive-evm-rpc.stakeme.pro',
    // Fallback (no API key)
    fallback: 'https://evm-rpc.sei-apis.com',
};

// All available RPCs for fallback chains
const allRpcs = [RPC_ENDPOINTS.primary, RPC_ENDPOINTS.secondary, RPC_ENDPOINTS.archive];

// Track which RPC to use next (round-robin)
let rpcIndex = 0;

/**
 * Get the next RPC URL in round-robin fashion
 */
export function getNextRpc(): string {
    const rpc = allRpcs[rpcIndex % allRpcs.length];
    rpcIndex++;
    return rpc;
}

/**
 * Get primary RPC (for important calls that need reliability)
 */
export function getPrimaryRpc(): string {
    return RPC_ENDPOINTS.primary;
}

/**
 * Get secondary RPC (for batch/heavy calls to avoid rate limits)
 */
export function getSecondaryRpc(): string {
    return RPC_ENDPOINTS.secondary;
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
    return RPC_ENDPOINTS.primary;
}

/**
 * RPC for pool/liquidity data: reserves, TVL, pool lookups, slot0
 * Uses archive RPC (secondary stakeme.pro returns empty for contract calls)
 */
export function getRpcForPoolData(): string {
    return RPC_ENDPOINTS.archive;
}

/**
 * RPC for voting/gauge data: weights, votes, epoch rewards, gauge lookups
 * Uses primary RPC (archive RPC returns 0 for fee rewards)
 */
export function getRpcForVoting(): string {
    return RPC_ENDPOINTS.primary;
}

/**
 * RPC for swap quotes: router quotes, quoter calls
 * Uses Alchemy for fastest response (paid tier) - only for user-facing swap quotes
 */
export function getRpcForQuotes(): string {
    return 'https://sei-mainnet.g.alchemy.com/v2/INhvk7-hUrgf5niZBGbae';
}

/**
 * Get fallback RPCs for a given primary choice (excludes the chosen one)
 */
export function getFallbackRpcs(excludeRpc: string): string[] {
    return allRpcs.filter(r => r !== excludeRpc);
}

/**
 * Make an RPC call with automatic fallback
 */
export async function rpcCall<T = any>(
    method: string,
    params: any[],
    preferredRpc?: string
): Promise<T> {
    const primary = preferredRpc || getNextRpc();
    const endpoints = [primary, ...getFallbackRpcs(primary)];

    let lastError: Error | null = null;

    for (const rpc of endpoints) {
        try {
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
        } catch (err) {
            lastError = err as Error;
            continue;
        }
    }

    throw lastError || new Error('All RPC endpoints failed');
}

/**
 * Make batch RPC calls with automatic fallback
 */
export async function batchRpcCall(
    calls: Array<{ method: string; params: any[] }>,
    preferredRpc?: string
): Promise<any[]> {
    const rpc = preferredRpc || getSecondaryRpc();

    try {
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
    } catch (err) {
        // Fallback to next available RPC
        const fallbacks = getFallbackRpcs(rpc);
        for (const fallback of fallbacks) {
            try {
                const response = await fetch(fallback, {
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
            } catch {
                continue;
            }
        }
        throw err;
    }
}

/**
 * Simple eth_call helper with fallback
 */
export async function ethCall(to: string, data: string): Promise<string> {
    return rpcCall<string>('eth_call', [{ to, data }, 'latest']);
}
