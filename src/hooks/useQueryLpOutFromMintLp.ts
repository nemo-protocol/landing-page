import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "./types"
import { ContractError } from "./types"
import { DEFAULT_Address } from "@/lib/constants"

// TODO: optimize the mutation
export default function useQueryLpOutFromMintLp(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async ({
      ptValue,
      syValue,
    }: {
      ptValue: string
      syValue: string
    }): Promise<[string] | [string, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const debugInfo: DebugInfo = {
        moveCall: [
          {
            target: `${coinConfig.nemoContractId}::router::get_lp_out_from_mint_lp`,
            arguments: [
              { name: "pt_value", value: ptValue },
              { name: "sy_value", value: syValue },
              { name: "market_state_id", value: coinConfig.marketStateId },
            ],
            typeArguments: [coinConfig.syCoinType],
          },
        ],
      }

      const tx = new Transaction()
      tx.setSender(address)
      tx.moveCall({
        target: debugInfo.moveCall[0].target,
        arguments: [
          tx.pure.u64(ptValue),
          tx.pure.u64(syValue),
          tx.object(coinConfig.marketStateId),
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

      if (!result?.results?.[0]?.returnValues?.[0]) {
        const message = "Failed to get LP amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[0].returnValues[0][0]),
      )

      debugInfo.parsedOutput = outputAmount.toString()

      const returnValue = outputAmount.toString()

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
