import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import { getPriceVoucher } from "@/lib/txHelper"
import { bcs } from "@mysten/sui/bcs"
import { DEFAULT_Address } from "@/lib/constants"
import Decimal from "decimal.js"
import { debugLog } from "@/config"

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useGetConversionRateDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()

  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async (): Promise<DryRunResult<T>> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [priceVoucher, priceVoucherMoveCallInfo] = getPriceVoucher(
        tx,
        coinConfig,
        "useGetConversionRateDryRun",
      )

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::oracle::get_price`,
        arguments: [{ name: "price_voucher", value: "priceVoucher" }],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [tx.object(priceVoucher)],
        typeArguments: moveCallInfo.typeArguments,
      })

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCallInfo, moveCallInfo],
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      debugInfo.rawResult = result

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[result.results.length - 1]?.returnValues?.[0]) {
        const message = "Failed to get PT amount"
        debugInfo.rawResult = {
          error: message,
        }
        debugLog("useGetConversionRateDryRun error", debugInfo)
        throw new ContractError(message, debugInfo)
      }

      const conversionRate = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const formattedConversionRate = new Decimal(conversionRate)
        .div(Math.pow(2, 64))
        .toFixed()

      debugInfo.parsedOutput = formattedConversionRate

      debugLog("useGetConversionRateDryRun", debugInfo)

      return (
        debug ? [formattedConversionRate, debugInfo] : formattedConversionRate
      ) as DryRunResult<T>
    },
  })
}
