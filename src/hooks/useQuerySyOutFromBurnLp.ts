import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "./types"
import { ContractError } from "./types"

export default function useQuerySyOutFromBurnLp(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async (
      lpValue: string,
    ): Promise<[string] | [string, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::burn_lp`,
          arguments: [
            { name: "lp_amount", value: lpValue },
            { name: "py_position", value: "pyPosition" },
            { name: "market", value: "market" },
            { name: "market_position", value: "marketPosition" },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

    //   let pyPosition
    //   let created = false
    //   if (!pyPositionData?.length) {
    //     created = true
    //     pyPosition = initPyPosition(tx, coinConfig)
    //   } else {
    //     pyPosition = tx.object(pyPositionData[0].id.id)
    //   }

      const tx = new Transaction()
      tx.setSender(address)

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.pure.u64(lpValue),
        //   tx.object(coinConfig.pyPositionId),
          tx.object(coinConfig.marketStateId),
        //   tx.object(coinConfig.marketPositionId),
          tx.object("0x6"),
        ],
        typeArguments: debugInfo.moveCall.typeArguments,
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
        const message = "Failed to get SY amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      debugInfo.parsedOutput = outputAmount.toString()

      const returnValue = outputAmount.toString()

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
} 