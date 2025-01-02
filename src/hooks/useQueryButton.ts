import { UseMutationResult } from "@tanstack/react-query"
import type { CoinConfig } from "@/queries/types/market"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import useQueryPtOutBySyInWithVoucher from "./useQueryPtOutBySyInWithVoucher"
import useQueryYtOutBySyInWithVoucher from "./useQueryYtOutBySyInWithVoucher"
import useQuerySyOutFromYtInWithVoucher from "./useQuerySyOutFromYtInWithVoucher"
import useQuerySyOutFromPtInWithVoucher from "./useQuerySyOutFromPtInWithVoucher"
import useQueryPriceVoucher from "./useQueryPriceVoucher"
import type { DebugInfo } from "./types"
import useGetObject from "./useGetObject"

export interface GetObjectParams {
  objectId: string
  options?: {
    showContent?: boolean
    showDisplay?: boolean
    showType?: boolean
    showOwner?: boolean
    showPreviousTransaction?: boolean
    showBcs?: boolean
    showStorageRebate?: boolean
  }
}

export type QueryInputMap = {
  PT_OUT_BY_SY_IN: string
  YT_OUT_BY_SY_IN: string
  LP_OUT_FROM_MINT: { ptValue: string; syValue: string }
  SY_OUT_BY_YT_IN: string
  SY_OUT_BY_PT_IN: string
  PRICE_VOUCHER: void
  GET_OBJECT: GetObjectParams
}

export const QUERY_CONFIGS = {
  GET_OBJECT: {
    target: "get_object",
    hook: useGetObject,
  },
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
  SY_OUT_BY_YT_IN: {
    target: "get_sy_amount_out_for_exact_yt_in_with_price_voucher",
    hook: useQuerySyOutFromYtInWithVoucher,
  },
  SY_OUT_BY_PT_IN: {
    target: "get_sy_amount_out_for_exact_pt_in_with_price_voucher",
    hook: useQuerySyOutFromPtInWithVoucher,
  },
  PRICE_VOUCHER: {
    target: "get_price_voucher",
    hook: useQueryPriceVoucher,
  },
} as const

export default function useQueryButton<T extends keyof QueryInputMap>(
  queryType: T,
  coinConfig?: CoinConfig,
  debug = false,
) {
  const config = QUERY_CONFIGS[queryType]
  return config.hook(coinConfig, debug) as unknown as UseMutationResult<
    [string] | [string, DebugInfo],
    Error,
    QueryInputMap[T]
  >
}
