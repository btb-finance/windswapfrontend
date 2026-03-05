// Centralized RPC configuration for Sei network
// Single RPC endpoint (Alchemy) for all categories

const DEFAULT_ALCHEMY_SEI_RPC = 'https://sei-evm-rpc.publicnode.com';
const FALLBACK_RPCS = [
    'https://sei-evm-rpc.publicnode.com',
    'https://sei.drpc.org',
    'https://evm-rpc.sei-apis.com/?x-apikey=f9e3e8c8',
];

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
    const rpcs = preferredRpc
        ? [preferredRpc, ...FALLBACK_RPCS.filter(r => r !== preferredRpc)]
        : [getAlchemyRpc(), ...FALLBACK_RPCS.filter(r => r !== getAlchemyRpc())];

    let lastError: Error = new Error('No RPC endpoints available');
    for (const rpc of rpcs) {
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

            if (response.status === 504 || response.status === 502 || response.status === 503) {
                lastError = new Error(`RPC gateway error (status=${response.status}) from ${rpc}`);
                continue;
            }

            const text = await response.text();
            let result: { error?: { message?: string }; result: T };
            try {
                result = JSON.parse(text) as typeof result;
            } catch {
                const ct = response.headers.get('content-type') || '';
                const snippet = text.slice(0, 200);
                lastError = new Error(`RPC returned non-JSON response (status=${response.status}, content-type=${ct}): ${snippet}`);
                continue;
            }
            if (result.error) {
                throw new Error(result.error.message || 'RPC error');
            }
            return result.result;
        } catch (err) {
            if (err instanceof Error && !err.message.startsWith('RPC')) throw err; // contract errors — don't retry
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }
    throw lastError;
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
        // Sort by id to ensure results align with original call order
        const sorted = [...results].sort((a, b) => {
            const aId = (a as { id?: number }).id ?? 0;
            const bId = (b as { id?: number }).id ?? 0;
            return aId - bId;
        });
        return sorted.map(r => (r as { result: unknown }).result);
    }
    return [(results as { result: unknown }).result];
}

/**
 * Simple eth_call helper with fallback
 */
export async function ethCall(to: string, data: string): Promise<string> {
    return rpcCall<string>('eth_call', [{ to, data }, 'latest']);
}
