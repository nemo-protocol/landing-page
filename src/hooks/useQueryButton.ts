import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import { getPriceVoucher } from "@/lib/txHelper"

interface QueryConfig {
  target: string
  needPriceVoucher?: boolean
  errorMessage: string
}

export const QUERY_CONFIGS: Record<string, QueryConfig> = {
  SY_OUT_BY_PT_IN: {
    target: "get_sy_amount_out_for_exact_pt_in_with_price_voucher",
    needPriceVoucher: true,
    errorMessage: "Failed to get SY amount"
  },
  PT_OUT_BY_SY_IN: {
    target: "get_pt_out_for_exact_sy_in_with_price_voucher",
    needPriceVoucher: true,
    errorMessage: "Failed to get PT amount"
  },
  SY_IN_BY_YT_OUT: {
    target: "get_sy_in_for_exact_yt_out",
    errorMessage: "Failed to get SY amount"
  },
  SY_IN_BY_YT_OUT_WITH_PRICE: {
    target: "get_sy_in_for_exact_yt_out_with_price",
    errorMessage: "Failed to get SY amount"
  },
  LP_OUT_BY_SY_IN: {
    target: "get_lp_out_for_exact_sy_in",
    errorMessage: "Failed to get LP amount"
  },
  LP_OUT_BY_MINT_LP: {
    target: "get_lp_out_for_mint_lp",
    errorMessage: "Failed to get LP amount"
  }
}

export default function useQueryButton(queryType: keyof typeof QUERY_CONFIGS, coinConfig?: CoinConfig, address?: string) {
  const client = useSuiClient()
  const config = QUERY_CONFIGS[queryType]

  return useMutation({
    mutationFn: async (inputAmount: string) => {
      if (!coinConfig || !address) {
        throw new Error("Missing required parameters")
      }

      const tx = new Transaction()
      tx.setSender(address)
      tx.moveCall({
        target: `${coinConfig.nemoContractId}::market::${config.target}`,
        arguments: [
          tx.pure.u64(inputAmount), // exact_pt_in
          ...(config.needPriceVoucher ? [getPriceVoucher(tx, coinConfig)[0]] : []), // price_voucher
          tx.object(coinConfig.pyStateId), // py_state
          tx.object(coinConfig.marketFactoryConfigId), // market_factory_config
          tx.object(coinConfig.marketStateId), // market
          tx.object("0x6"), // clock
        ],
        typeArguments: [coinConfig.syCoinType],
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        throw new Error(config.errorMessage)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )
      return outputAmount.toString()
    }
  })
} 