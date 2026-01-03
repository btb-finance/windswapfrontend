/**
 * Uniswap V3 Concentrated Liquidity Math
 * 
 * Ported from Solidity contracts:
 * - TickMath.sol
 * - LiquidityAmounts.sol
 * - SqrtPriceMath.sol
 * 
 * All calculations use BigInt for precision where possible,
 * with Number fallbacks for sqrt operations.
 */

// Q96 = 2^96 - the fixed-point scaling factor for sqrtPriceX96
const Q96 = BigInt(2) ** BigInt(96);
const Q192 = Q96 * Q96;

// Tick bounds from TickMath.sol
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// Min/max sqrt ratios from TickMath.sol
export const MIN_SQRT_RATIO = BigInt('4295128739');
export const MAX_SQRT_RATIO = BigInt('1461446703485210103287273052203988822378723970342');

/**
 * Calculates sqrt(1.0001^tick) * 2^96
 * Equivalent to TickMath.getSqrtRatioAtTick()
 * 
 * @param tick - The tick value
 * @returns sqrtPriceX96 as BigInt
 */
export function getSqrtRatioAtTick(tick: number): bigint {
    const absTick = Math.abs(tick);
    if (absTick > MAX_TICK) {
        throw new Error(`Tick ${tick} out of bounds`);
    }

    // Use the same bit manipulation as Solidity for precision
    let ratio = (absTick & 0x1) !== 0
        ? BigInt('0xfffcb933bd6fad37aa2d162d1a594001')
        : BigInt('0x100000000000000000000000000000000');

    if ((absTick & 0x2) !== 0) ratio = (ratio * BigInt('0xfff97272373d413259a46990580e213a')) >> BigInt(128);
    if ((absTick & 0x4) !== 0) ratio = (ratio * BigInt('0xfff2e50f5f656932ef12357cf3c7fdcc')) >> BigInt(128);
    if ((absTick & 0x8) !== 0) ratio = (ratio * BigInt('0xffe5caca7e10e4e61c3624eaa0941cd0')) >> BigInt(128);
    if ((absTick & 0x10) !== 0) ratio = (ratio * BigInt('0xffcb9843d60f6159c9db58835c926644')) >> BigInt(128);
    if ((absTick & 0x20) !== 0) ratio = (ratio * BigInt('0xff973b41fa98c081472e6896dfb254c0')) >> BigInt(128);
    if ((absTick & 0x40) !== 0) ratio = (ratio * BigInt('0xff2ea16466c96a3843ec78b326b52861')) >> BigInt(128);
    if ((absTick & 0x80) !== 0) ratio = (ratio * BigInt('0xfe5dee046a99a2a811c461f1969c3053')) >> BigInt(128);
    if ((absTick & 0x100) !== 0) ratio = (ratio * BigInt('0xfcbe86c7900a88aedcffc83b479aa3a4')) >> BigInt(128);
    if ((absTick & 0x200) !== 0) ratio = (ratio * BigInt('0xf987a7253ac413176f2b074cf7815e54')) >> BigInt(128);
    if ((absTick & 0x400) !== 0) ratio = (ratio * BigInt('0xf3392b0822b70005940c7a398e4b70f3')) >> BigInt(128);
    if ((absTick & 0x800) !== 0) ratio = (ratio * BigInt('0xe7159475a2c29b7443b29c7fa6e889d9')) >> BigInt(128);
    if ((absTick & 0x1000) !== 0) ratio = (ratio * BigInt('0xd097f3bdfd2022b8845ad8f792aa5825')) >> BigInt(128);
    if ((absTick & 0x2000) !== 0) ratio = (ratio * BigInt('0xa9f746462d870fdf8a65dc1f90e061e5')) >> BigInt(128);
    if ((absTick & 0x4000) !== 0) ratio = (ratio * BigInt('0x70d869a156d2a1b890bb3df62baf32f7')) >> BigInt(128);
    if ((absTick & 0x8000) !== 0) ratio = (ratio * BigInt('0x31be135f97d08fd981231505542fcfa6')) >> BigInt(128);
    if ((absTick & 0x10000) !== 0) ratio = (ratio * BigInt('0x9aa508b5b7a84e1c677de54f3e99bc9')) >> BigInt(128);
    if ((absTick & 0x20000) !== 0) ratio = (ratio * BigInt('0x5d6af8dedb81196699c329225ee604')) >> BigInt(128);
    if ((absTick & 0x40000) !== 0) ratio = (ratio * BigInt('0x2216e584f5fa1ea926041bedfe98')) >> BigInt(128);
    if ((absTick & 0x80000) !== 0) ratio = (ratio * BigInt('0x48a170391f7dc42444e8fa2')) >> BigInt(128);

    if (tick > 0) {
        const maxUint256 = (BigInt(1) << BigInt(256)) - BigInt(1);
        ratio = maxUint256 / ratio;
    }

    // Convert from Q128.128 to Q64.96, rounding up
    const remainder = ratio % (BigInt(1) << BigInt(32));
    const sqrtPriceX96 = (ratio >> BigInt(32)) + (remainder === BigInt(0) ? BigInt(0) : BigInt(1));

    return sqrtPriceX96;
}

/**
 * Calculates the tick for a given sqrtPriceX96
 * Equivalent to TickMath.getTickAtSqrtRatio()
 * 
 * @param sqrtPriceX96 - The sqrt price as a Q64.96
 * @returns The tick value
 */
export function getTickAtSqrtRatio(sqrtPriceX96: bigint): number {
    if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 >= MAX_SQRT_RATIO) {
        throw new Error('sqrtPriceX96 out of bounds');
    }

    // Use logarithm approach for TypeScript (simpler than bit manipulation)
    const sqrtPriceFloat = Number(sqrtPriceX96) / Number(Q96);
    const price = sqrtPriceFloat * sqrtPriceFloat;
    const tick = Math.floor(Math.log(price) / Math.log(1.0001));

    // Verify and adjust if needed
    const sqrtRatioAtTick = getSqrtRatioAtTick(tick);
    const sqrtRatioAtTickPlusOne = getSqrtRatioAtTick(tick + 1);

    if (sqrtRatioAtTickPlusOne <= sqrtPriceX96) {
        return tick + 1;
    }
    if (sqrtRatioAtTick > sqrtPriceX96) {
        return tick - 1;
    }
    return tick;
}

/**
 * Convert a human-readable price to sqrtPriceX96
 * 
 * @param price - Human readable price (token1 per token0)
 * @param token0Decimals - Decimals of token0
 * @param token1Decimals - Decimals of token1
 * @returns sqrtPriceX96 as BigInt
 */
export function priceToSqrtPriceX96(
    price: number,
    token0Decimals: number,
    token1Decimals: number
): bigint {
    // Adjust for decimal difference
    const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals);
    const sqrtPrice = Math.sqrt(adjustedPrice);

    // Scale by Q96
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
    return sqrtPriceX96;
}

/**
 * Convert sqrtPriceX96 to a human-readable price
 * 
 * @param sqrtPriceX96 - The sqrt price as Q64.96
 * @param token0Decimals - Decimals of token0
 * @param token1Decimals - Decimals of token1
 * @returns Human readable price (token1 per token0)
 */
export function sqrtPriceX96ToPrice(
    sqrtPriceX96: bigint,
    token0Decimals: number,
    token1Decimals: number
): number {
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const rawPrice = sqrtPrice * sqrtPrice;
    // Adjust for decimal difference
    return rawPrice * Math.pow(10, token0Decimals - token1Decimals);
}

/**
 * Convert a human-readable price to a tick, aligned to tick spacing
 * 
 * @param price - Human readable price (tokenB per tokenA, where A is the "base" in UI)
 * @param token0Decimals - Decimals of token0 (lower address)
 * @param token1Decimals - Decimals of token1 (higher address)
 * @param tickSpacing - The tick spacing of the pool
 * @param isToken0Base - Whether token0 is the base token in the UI price
 * @returns Tick aligned to tick spacing
 */
export function priceToTick(
    price: number,
    token0Decimals: number,
    token1Decimals: number,
    tickSpacing: number,
    isToken0Base: boolean = true
): number {
    if (price <= 0) return 0;

    // If token0 is base, price is token1/token0 which is what the pool uses
    // If token1 is base, price is token0/token1, so we need to invert
    const poolPrice = isToken0Base ? price : 1 / price;

    // Adjust for decimal difference
    const adjustedPrice = poolPrice * Math.pow(10, token1Decimals - token0Decimals);

    // Calculate tick: tick = log(price) / log(1.0001)
    const rawTick = Math.log(adjustedPrice) / Math.log(1.0001);

    // Round to nearest tick spacing
    return Math.round(rawTick / tickSpacing) * tickSpacing;
}

/**
 * Convert a tick to a human-readable price
 * 
 * @param tick - The tick value
 * @param token0Decimals - Decimals of token0 (lower address)
 * @param token1Decimals - Decimals of token1 (higher address)
 * @param isToken0Base - Whether token0 is the base token in the UI price
 * @returns Human readable price
 */
export function tickToPrice(
    tick: number,
    token0Decimals: number,
    token1Decimals: number,
    isToken0Base: boolean = true
): number {
    // price = 1.0001^tick
    const rawPrice = Math.pow(1.0001, tick);

    // Adjust for decimals
    const adjustedPrice = rawPrice * Math.pow(10, token0Decimals - token1Decimals);

    // Invert if token1 is base
    return isToken0Base ? adjustedPrice : 1 / adjustedPrice;
}

// ============================================================================
// LIQUIDITY AMOUNT CALCULATIONS
// From LiquidityAmounts.sol
// ============================================================================

/**
 * Computes the amount of liquidity for a given amount of token0
 * Calculates: amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
 * 
 * @param sqrtRatioAX96 - First sqrt price boundary
 * @param sqrtRatioBX96 - Second sqrt price boundary
 * @param amount0 - Amount of token0
 * @returns Liquidity amount
 */
export function getLiquidityForAmount0(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint
): bigint {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
    const denominator = Q96 * (sqrtRatioBX96 - sqrtRatioAX96);

    return numerator / denominator;
}

/**
 * Computes the amount of liquidity for a given amount of token1
 * Calculates: amount1 / (sqrt(upper) - sqrt(lower))
 * 
 * @param sqrtRatioAX96 - First sqrt price boundary
 * @param sqrtRatioBX96 - Second sqrt price boundary
 * @param amount1 - Amount of token1
 * @returns Liquidity amount
 */
export function getLiquidityForAmount1(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount1: bigint
): bigint {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

/**
 * Computes the maximum liquidity for given amounts of token0 and token1
 * This determines which token is the limiting factor
 * 
 * @param sqrtRatioX96 - Current sqrt price
 * @param sqrtRatioAX96 - Lower sqrt price boundary
 * @param sqrtRatioBX96 - Upper sqrt price boundary
 * @param amount0 - Amount of token0
 * @param amount1 - Amount of token1
 * @returns Maximum liquidity that can be minted
 */
export function getLiquidityForAmounts(
    sqrtRatioX96: bigint,
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint,
    amount1: bigint
): bigint {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    if (sqrtRatioX96 <= sqrtRatioAX96) {
        // Current price is below range - only token0 is needed
        return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
    } else if (sqrtRatioX96 < sqrtRatioBX96) {
        // Current price is within range - need both tokens
        const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0);
        const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1);
        // Return the smaller (limiting factor)
        return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    } else {
        // Current price is above range - only token1 is needed
        return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
    }
}

/**
 * Computes the amount of token0 for a given liquidity amount
 * 
 * @param sqrtRatioAX96 - First sqrt price boundary
 * @param sqrtRatioBX96 - Second sqrt price boundary
 * @param liquidity - Liquidity amount
 * @returns Amount of token0
 */
export function getAmount0ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const numerator = liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96);
    return numerator / sqrtRatioBX96 / sqrtRatioAX96;
}

/**
 * Computes the amount of token1 for a given liquidity amount
 * 
 * @param sqrtRatioAX96 - First sqrt price boundary
 * @param sqrtRatioBX96 - Second sqrt price boundary
 * @param liquidity - Liquidity amount
 * @returns Amount of token1
 */
export function getAmount1ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    return (liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) / Q96;
}

/**
 * Computes both token amounts for a given liquidity at the current price
 * 
 * @param sqrtRatioX96 - Current sqrt price
 * @param sqrtRatioAX96 - Lower sqrt price boundary
 * @param sqrtRatioBX96 - Upper sqrt price boundary
 * @param liquidity - Liquidity amount
 * @returns Object with amount0 and amount1
 */
export function getAmountsForLiquidity(
    sqrtRatioX96: bigint,
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): { amount0: bigint; amount1: bigint } {
    // Ensure A < B
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    let amount0 = BigInt(0);
    let amount1 = BigInt(0);

    if (sqrtRatioX96 <= sqrtRatioAX96) {
        // Current price below range - only token0
        amount0 = getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
    } else if (sqrtRatioX96 < sqrtRatioBX96) {
        // Current price within range - both tokens
        amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioBX96, liquidity);
        amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioX96, liquidity);
    } else {
        // Current price above range - only token1
        amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
    }

    return { amount0, amount1 };
}

// ============================================================================
// HIGH-LEVEL HELPER FUNCTIONS FOR UI
// ============================================================================

export interface PositionAmounts {
    amount0: bigint;
    amount1: bigint;
    liquidity: bigint;
}

export interface RangePosition {
    currentPrice: number;
    priceLower: number;
    priceUpper: number;
    token0Decimals: number;
    token1Decimals: number;
    tickSpacing: number;
}

/**
 * Given amount0 and a price range, calculate the required amount1
 * This is what you need when user enters tokenA (if tokenA is token0)
 * 
 * @param amount0Wei - Amount of token0 in wei
 * @param position - Position details including prices and decimals
 * @returns Required amount1 in wei, or 0 if single-sided
 */
export function calculateAmount1FromAmount0(
    amount0Wei: bigint,
    position: RangePosition
): bigint {
    const { currentPrice, priceLower, priceUpper, token0Decimals, token1Decimals, tickSpacing } = position;

    // Convert prices to sqrt ratios
    const sqrtRatioX96 = priceToSqrtPriceX96(currentPrice, token0Decimals, token1Decimals);
    const sqrtRatioLowerX96 = priceToSqrtPriceX96(priceLower, token0Decimals, token1Decimals);
    const sqrtRatioUpperX96 = priceToSqrtPriceX96(priceUpper, token0Decimals, token1Decimals);

    // Ensure lower < upper
    const [sqrtRatioAX96, sqrtRatioBX96] = sqrtRatioLowerX96 < sqrtRatioUpperX96
        ? [sqrtRatioLowerX96, sqrtRatioUpperX96]
        : [sqrtRatioUpperX96, sqrtRatioLowerX96];

    // If current price is below range, only token0 is needed
    if (sqrtRatioX96 <= sqrtRatioAX96) {
        return BigInt(0);
    }

    // If current price is above range, only token1 is needed (amount0 should be 0)
    if (sqrtRatioX96 >= sqrtRatioBX96) {
        return BigInt(0);
    }

    // Current price is within range - calculate liquidity from amount0, then derive amount1
    const liquidity = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0Wei);
    const amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioX96, liquidity);

    return amount1;
}

/**
 * Given amount1 and a price range, calculate the required amount0
 * This is what you need when user enters tokenB (if tokenB is token1)
 * 
 * @param amount1Wei - Amount of token1 in wei
 * @param position - Position details including prices and decimals
 * @returns Required amount0 in wei, or 0 if single-sided
 */
export function calculateAmount0FromAmount1(
    amount1Wei: bigint,
    position: RangePosition
): bigint {
    const { currentPrice, priceLower, priceUpper, token0Decimals, token1Decimals } = position;

    // Convert prices to sqrt ratios
    const sqrtRatioX96 = priceToSqrtPriceX96(currentPrice, token0Decimals, token1Decimals);
    const sqrtRatioLowerX96 = priceToSqrtPriceX96(priceLower, token0Decimals, token1Decimals);
    const sqrtRatioUpperX96 = priceToSqrtPriceX96(priceUpper, token0Decimals, token1Decimals);

    // Ensure lower < upper
    const [sqrtRatioAX96, sqrtRatioBX96] = sqrtRatioLowerX96 < sqrtRatioUpperX96
        ? [sqrtRatioLowerX96, sqrtRatioUpperX96]
        : [sqrtRatioUpperX96, sqrtRatioLowerX96];

    // If current price is above range, only token1 is needed
    if (sqrtRatioX96 >= sqrtRatioBX96) {
        return BigInt(0);
    }

    // If current price is below range, only token0 is needed (amount1 should be 0)
    if (sqrtRatioX96 <= sqrtRatioAX96) {
        return BigInt(0);
    }

    // Current price is within range - calculate liquidity from amount1, then derive amount0
    const liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1Wei);
    const amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioBX96, liquidity);

    return amount0;
}

/**
 * Determine which tokens are required for a position given the price range
 * 
 * @param currentPrice - Current pool price
 * @param priceLower - Lower bound of range
 * @param priceUpper - Upper bound of range
 * @returns Object indicating which tokens are needed
 */
export function getRequiredTokens(
    currentPrice: number,
    priceLower: number,
    priceUpper: number
): { needsToken0: boolean; needsToken1: boolean; isSingleSided: boolean } {
    // Ensure lower < upper
    const [lower, upper] = priceLower < priceUpper
        ? [priceLower, priceUpper]
        : [priceUpper, priceLower];

    if (currentPrice <= lower) {
        // Price below range - only token0 needed (waiting for price to rise)
        return { needsToken0: true, needsToken1: false, isSingleSided: true };
    } else if (currentPrice >= upper) {
        // Price above range - only token1 needed (waiting for price to fall)
        return { needsToken0: false, needsToken1: true, isSingleSided: true };
    } else {
        // Price within range - both tokens needed
        return { needsToken0: true, needsToken1: true, isSingleSided: false };
    }
}

/**
 * Calculate the optimal amounts for a position given one input amount
 * Returns both amounts and which one was used as input
 * 
 * @param inputAmount - The amount user entered (in wei)
 * @param inputIsToken0 - Whether the input is token0 or token1
 * @param position - Position details
 * @returns Calculated amounts for both tokens
 */
export function calculateOptimalAmounts(
    inputAmount: bigint,
    inputIsToken0: boolean,
    position: RangePosition
): PositionAmounts {
    const { currentPrice, priceLower, priceUpper, token0Decimals, token1Decimals } = position;

    const required = getRequiredTokens(currentPrice, priceLower, priceUpper);

    // Convert prices to sqrt ratios
    const sqrtRatioX96 = priceToSqrtPriceX96(currentPrice, token0Decimals, token1Decimals);
    const sqrtRatioLowerX96 = priceToSqrtPriceX96(priceLower, token0Decimals, token1Decimals);
    const sqrtRatioUpperX96 = priceToSqrtPriceX96(priceUpper, token0Decimals, token1Decimals);

    // Ensure lower < upper
    const [sqrtRatioAX96, sqrtRatioBX96] = sqrtRatioLowerX96 < sqrtRatioUpperX96
        ? [sqrtRatioLowerX96, sqrtRatioUpperX96]
        : [sqrtRatioUpperX96, sqrtRatioLowerX96];

    if (inputIsToken0) {
        if (!required.needsToken0) {
            // Token0 not needed for this range
            return { amount0: BigInt(0), amount1: BigInt(0), liquidity: BigInt(0) };
        }

        if (required.isSingleSided && required.needsToken0) {
            // Only token0 needed
            const liquidity = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, inputAmount);
            return { amount0: inputAmount, amount1: BigInt(0), liquidity };
        }

        // Both tokens needed - calculate amount1 from amount0
        const amount1 = calculateAmount1FromAmount0(inputAmount, position);
        const liquidity = getLiquidityForAmounts(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, inputAmount, amount1);
        return { amount0: inputAmount, amount1, liquidity };
    } else {
        if (!required.needsToken1) {
            // Token1 not needed for this range
            return { amount0: BigInt(0), amount1: BigInt(0), liquidity: BigInt(0) };
        }

        if (required.isSingleSided && required.needsToken1) {
            // Only token1 needed
            const liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, inputAmount);
            return { amount0: BigInt(0), amount1: inputAmount, liquidity };
        }

        // Both tokens needed - calculate amount0 from amount1
        const amount0 = calculateAmount0FromAmount1(inputAmount, position);
        const liquidity = getLiquidityForAmounts(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, amount0, inputAmount);
        return { amount0, amount1: inputAmount, liquidity };
    }
}

/**
 * Format a BigInt wei value to a human-readable string
 * 
 * @param wei - Amount in wei
 * @param decimals - Token decimals
 * @param displayDecimals - Number of decimals to show (default 6)
 * @returns Formatted string
 */
export function formatFromWei(wei: bigint, decimals: number, displayDecimals: number = 6): string {
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = wei / divisor;
    const fractionalPart = wei % divisor;

    // Pad fractional part to full decimals
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    // Trim to displayDecimals
    fractionalStr = fractionalStr.slice(0, displayDecimals);
    // Remove trailing zeros
    fractionalStr = fractionalStr.replace(/0+$/, '');

    if (fractionalStr.length === 0) {
        return integerPart.toString();
    }

    return `${integerPart}.${fractionalStr}`;
}

/**
 * Parse a human-readable amount to wei
 * 
 * @param amount - Human readable amount
 * @param decimals - Token decimals
 * @returns Amount in wei as BigInt
 */
export function parseToWei(amount: string | number, decimals: number): bigint {
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    if (!amountStr || amountStr === '') return BigInt(0);

    const [integerPart, fractionalPart = ''] = amountStr.split('.');
    const paddedFractional = (fractionalPart + '0'.repeat(decimals)).slice(0, decimals);

    return BigInt(integerPart + paddedFractional);
}
