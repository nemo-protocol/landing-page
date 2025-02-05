export const network = import.meta.env.VITE_NETWORK
export const IS_DEV = import.meta.env.MODE === "development"
export const GAS_BUDGET = import.meta.env.VITE_GAS_BUDGET
export const DEBUG = import.meta.env.VITE_DEBUG
export const MODE = import.meta.env.VITE_MODE

export function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log(...args)
  }
}
