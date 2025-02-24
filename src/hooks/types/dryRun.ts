import { DebugInfo } from "../types"

/**
 * Base type for dry run results
 * @template TResult - The actual result type
 * @template TDebug - Whether to include debug info
 */
export type BaseDryRunResult<TResult, TDebug extends boolean = false> = TDebug extends true
  ? [TResult, DebugInfo]
  : TResult

/**
 * Helper function to create dry run results
 */
export function createDryRunResult<TResult, TDebug extends boolean>(
  result: TResult,
  debug: TDebug,
  debugInfo?: DebugInfo
): BaseDryRunResult<TResult, TDebug> {
  if (debug) {
    return [result, debugInfo!] as BaseDryRunResult<TResult, TDebug>
  }
  return result as BaseDryRunResult<TResult, TDebug>
}