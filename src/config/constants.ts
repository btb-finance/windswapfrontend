// Application-wide constants

export const DEBOUNCE_MS = {
  QUOTE: 300,
  INPUT: 150,
  SEARCH: 200,
} as const;

export const SLIPPAGE = {
  MIN: 0.1, // 0.1%
  MAX: 50, // 50%
  DEFAULT: 0.5, // 0.5%
  PRESETS: [0.1, 0.5, 1, 3, 5], // Common slippage options
} as const;

export const DEADLINE = {
  MIN: 1, // 1 minute
  MAX: 60 * 24, // 24 hours
  DEFAULT: 30, // 30 minutes
} as const;

export const TOKEN = {
  MIN_DECIMALS: 6,
  MAX_DECIMALS: 18,
  MAX_SYMBOL_LENGTH: 11,
  MAX_NAME_LENGTH: 32,
} as const;

export const CHAIN = {
  SEI_CHAIN_ID: 1329 as const,
} as const;

export const TRANSACTION = {
  SIMULATION_TIMEOUT: 10000, // 10 seconds
  CONFIRMATION_BLOCKS: 1,
} as const;

export const UI = {
  TOAST_DURATION: 4000, // 4 seconds
  TOAST_SUCCESS_DURATION: 3000,
  TOAST_ERROR_DURATION: 6000,
} as const;
