import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "./types"
import type { DebugInfo } from "./types"
import { getPriceVoucher } from "@/lib/txHelper"
import { DEFAULT_Address } from "@/lib/constants"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import { debugLog } from "@/config"

interface MoveCallInfo {
  target: string
  arguments: { name: string; value: string }[]
  typeArguments: string[]
}

export default function useQueryPriceVoucher(
  coinConfig?: CoinConfig,
  debug: boolean = false,
  caller?: string,
) {
  const client = useSuiClient()
  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async (): Promise<string | [string, DebugInfo]> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [, moveCallInfo] = getPriceVoucher(tx, coinConfig, caller)

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo as MoveCallInfo],
      }

      if (!debug) {
        debugLog(
          `[${caller}] useQueryPriceVoucher move call:`,
          debugInfo.moveCall,
        )
      }

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
        throw new ContractError(
          "useQueryPriceVoucher error: " + result.error,
          debugInfo,
        )
      }

      if (!result?.results?.[0]?.returnValues?.[0]) {
        const message = "Failed to get price voucher"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputVoucher = bcs.U128.parse(
        new Uint8Array(result.results[0].returnValues[0][0]),
      ).toString()

      debugInfo.parsedOutput = outputVoucher

      return debug ? [outputVoucher, debugInfo] : outputVoucher
    },
  })
}
