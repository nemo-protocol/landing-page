import { UseMutationResult } from "@tanstack/react-query"
import type { CoinConfig } from "@/queries/types/market"
import useQueryPtOutBySyInWithVoucher from "./useQueryPtOutBySyInWithVoucher"
import useQueryYtOutBySyInWithVoucher from "./useQueryYtOutBySyInWithVoucher"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import type { DebugInfo } from "./types"
import type { QueryInput } from "./types"

interface QueryConfig<> {
  target: string
  hook: (
    coinConfig?: CoinConfig,
    debug?: boolean
  ) => UseMutationResult<[string] | [string, DebugInfo], Error, QueryInput>
}

export const QUERY_CONFIGS: Record<string, QueryConfig> = {
  PT_OUT_BY_SY_IN: {
    target: "get_pt_out_for_exact_sy_in_with_price_voucher",
    hook: useQueryPtOutBySyInWithVoucher,
  },
  YT_OUT_BY_SY_IN: {
    target: "get_yt_out_for_exact_sy_in_with_price_voucher", 
    hook: useQueryYtOutBySyInWithVoucher,
  },
  LP_OUT_FROM_MINT: {
    target: "get_lp_out_from_mint_lp",
    hook: useQueryLpOutFromMintLp,
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
