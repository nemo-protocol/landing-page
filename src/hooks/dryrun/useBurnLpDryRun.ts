import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, LpPosition, PyPosition } from "../types"
import { ContractError } from "../types"
import useFetchLpPosition from "../useFetchLpPosition"
import useFetchPyPosition from "../useFetchPyPosition"
import { initPyPosition, mergeLpPositions } from "@/lib/txHelper"
import Decimal from "decimal.js"

type BurnLpResult = {
  syAmount: string
  ptAmount: string
}

export default function useBurnLpDryRun(
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
      config?: CoinConfig,
    ): Promise<[BurnLpResult] | [BurnLpResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      const effectiveConfig = config || coinConfig
      if (!effectiveConfig) {
        throw new Error("Please select a pool")
      }

      const [marketPositions] = (await fetchLpPositionAsync()) as [LpPosition[]]
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
        pyPosition = initPyPosition(tx, effectiveConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const decimal = Number(effectiveConfig?.decimal)

      // Merge LP positions
      const mergedPosition = mergeLpPositions(
        tx,
        effectiveConfig,
        marketPositions,
        lpValue,
        decimal,
      )

      const lpAmount = new Decimal(lpValue).mul(10 ** decimal).toFixed()

      console.log("mergedPosition", mergedPosition)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${effectiveConfig.nemoContractId}::market::burn_lp`,
          arguments: [
            { name: "lp_amount", value: lpAmount },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id,
            },
            { name: "market", value: "market" },
            { name: "market_position", value: marketPositions[0].id.id },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [effectiveConfig.syCoinType],
        },
      }

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.object(effectiveConfig.version),
          tx.pure.u64(lpAmount),
          pyPosition,
          tx.object(effectiveConfig.marketStateId),
          mergedPosition,
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

      console.log("result", result?.events?.[0]?.parsedJson)

      if (!result?.events?.[0]?.parsedJson) {
        const message = "Failed to get burn data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = result.events[0].parsedJson.sy_amount as string
      const ptAmount = result.events[0].parsedJson.pt_amount as string

      debugInfo.parsedOutput = JSON.stringify({ syAmount, ptAmount })

      const returnValue = { syAmount, ptAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
