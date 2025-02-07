import { bcs } from "@mysten/sui/bcs"
import { debugLog } from "@/config"
import { ContractError } from "./types"
import type { DebugInfo } from "./types"
import { getPriceVoucher } from "@/lib/txHelper"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import Decimal from "decimal.js"

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : [string, string]

export default function useQueryYtOutBySyInWithVoucher<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async (syValue: string): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const debugInfo: DebugInfo = {
        moveCall: [{
          target: `${coinConfig.nemoContractId}::router::get_yt_out_for_exact_sy_in_with_price_voucher`,
          arguments: [
            { name: "net_sy_in", value: syValue },
            { name: "min_yt_out", value: "0" },
            { name: "price_voucher", value: "priceVoucher" },
            { name: "py_state_id", value: coinConfig.pyStateId },
            {
              name: "market_factory_config_id",
              value: coinConfig.marketFactoryConfigId,
            },
            { name: "market_state_id", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        }],
      }

      debugLog("get_yt_out_for_exact_sy_in_with_price_voucher move call:", debugInfo)

      const tx = new Transaction()
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)
      tx.setSender(address)

      tx.moveCall({
        target: debugInfo.moveCall[0].target,
        arguments: [
          tx.pure.u64(syValue),
          tx.pure.u64("0"),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: debugInfo.moveCall[0].typeArguments,
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get YT amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      const fee = bcs.U128.parse(
        new Uint8Array(result.results[1].returnValues[1][0]),
      )
      const formattedFee = new Decimal(fee).div(2 ** 64).div(10 ** Number(coinConfig.decimal)).toString()

      const formattedAmount = new Decimal(outputAmount.toString())
        .div(10 ** Number(coinConfig.decimal))
        .toFixed()

      debugInfo.parsedOutput = formattedAmount

      return (debug ? [formattedAmount, debugInfo] : [formattedAmount, formattedFee]) as DryRunResult<T>
    },
  })
}
