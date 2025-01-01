import { UseMutationResult } from "@tanstack/react-query"
import type { CoinConfig } from "@/queries/types/market"
import useQueryPtOutBySyInWithVoucher from "./useQueryPtOutBySyInWithVoucher"
import type { DebugInfo } from "./types"

interface QueryConfig {
  target: string
  hook: (
    coinConfig?: CoinConfig,
    debug?: boolean
  ) => UseMutationResult<(string | DebugInfo)[], Error, string>
}

export const QUERY_CONFIGS: Record<string, QueryConfig> = {
  PT_OUT_BY_SY_IN: {
    target: "get_pt_out_for_exact_sy_in_with_price_voucher",
    hook: useQueryPtOutBySyInWithVoucher,
  },
}

export default function useQueryButton(
  queryType: keyof typeof QUERY_CONFIGS,
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const config = QUERY_CONFIGS[queryType]
  return config.hook(coinConfig, debug)
}
