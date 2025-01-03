import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "./types"
import { ContractError } from "./types"
import useFetchLpPosition, {
  type LppMarketPosition,
} from "./useFetchLpPosition"
import useFetchPyPosition, { type PyPosition } from "./useFetchPyPosition"
import { initPyPosition, mergeLpPositions } from "@/lib/txHelper"

export default function useBurnLpMutation(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchLpPositionAsync } = useFetchLpPosition(coinConfig)
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

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

      // Fetch position data
      const [marketPositions] = (await fetchLpPositionAsync()) as [
        LppMarketPosition[],
      ]
      const [pyPositions] = (await fetchPyPositionAsync()) as [PyPosition[]]

      if (!marketPositions?.length) {
        throw new Error("No LP market position found")
      }

      const tx = new Transaction()
      tx.setSender(address)

      // Handle py position creation
      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id.id)
      }

      // Merge LP positions
      // const mergedPosition = mergeLpPositions(
      //   tx,
      //   coinConfig,
      //   marketPositions,
      //   lpValue,
      //   coinConfig.decimal,
      // )

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::burn_lp`,
          arguments: [
            { name: "lp_amount", value: lpValue },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id.id,
            },
            { name: "market", value: "market" },
            { name: "market_position", value: marketPositions[0].id.id },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(lpValue),
          pyPosition,
          tx.object(coinConfig.marketStateId),
          // mergedPosition,
          tx.object(marketPositions[0].id.id),
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

      console.log("result?.error", result)

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[result.results.length - 1]?.returnValues?.[0]) {
        const message = "Failed to get SY amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[result.results.length - 1].returnValues[0][0]),
      )

      debugInfo.parsedOutput = outputAmount.toString()

      const returnValue = outputAmount.toString()

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
