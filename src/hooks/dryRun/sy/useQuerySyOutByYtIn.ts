import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../../types"
import { ContractError } from "../../types"
import { getPriceVoucher } from "@/lib/txHelper"
import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { DEFAULT_Address } from "@/lib/constants"

interface SyOutByYtInResult {
  syValue: string
  syAmount: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [SyOutByYtInResult, DebugInfo]
  : SyOutByYtInResult

export default function useQuerySyOutByYtInDryRun<T extends boolean = false>(
  { outerCoinConfig, debug }: { outerCoinConfig?: CoinConfig; debug?: T } = {
    debug: false as T,
  },
) {
  const client = useSuiClient()
  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async ({
      ytAmount,
      innerCoinConfig,
    }: {
      ytAmount: string
      innerCoinConfig?: CoinConfig
    }): Promise<DryRunResult<T>> => {
      const coinConfig = outerCoinConfig || innerCoinConfig
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      // Get price voucher first
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::router::get_sy_amount_out_for_exact_yt_in_with_price_voucher`,
        arguments: [
          { name: "exact_yt_in", value: ytAmount },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(ytAmount),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: moveCallInfo.typeArguments,
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        result,
        moveCall: [moveCallInfo],
      }

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        if (!debug) {
          debugLog(
            "get_sy_amount_out_for_exact_yt_in_with_price_voucher move call error:",
            debugInfo,
          )
        }
        throw new ContractError(result.error, debugInfo)
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get sy amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      const syValue = new Decimal(syAmount.toString())
        .div(10 ** Number(coinConfig.decimal))
        .toFixed()

      debugInfo.parsedOutput = syAmount

      const resultObj = { syValue, syAmount }
      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
