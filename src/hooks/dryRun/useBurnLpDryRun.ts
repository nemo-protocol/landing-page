import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../types"
import { ContractError } from "../types"
import useFetchLpPosition from "../useFetchLpPosition"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  initPyPosition,
  mergeLpPositions,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"
import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"

type BurnLpResult = {
  ptAmount: string
  syAmount: string
  ptValue: string
  syValue: string
  outputValue: string
  outputAmount: string
}

interface BurnLpParams {
  lpValue: string
  receivingType?: "underlying" | "sy"
}

export default function useBurnLpDryRun(
  outerCoinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchLpPositionAsync } =
    useFetchLpPosition(outerCoinConfig)
  const { mutateAsync: fetchPyPositionAsync } =
    useFetchPyPosition(outerCoinConfig)

  return useMutation({
    mutationFn: async (
      input: string | BurnLpParams,
      innerConfig?: CoinConfig,
    ): Promise<[BurnLpResult] | [BurnLpResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }

      const coinConfig = innerConfig || outerCoinConfig
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      // Handle both string input and object input for backward compatibility
      const lpValue = typeof input === "string" ? input : input.lpValue
      const receivingType =
        typeof input === "string"
          ? "underlying"
          : input.receivingType || "underlying"

      const marketPositions = await fetchLpPositionAsync()
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
        pyPosition = tx.object(pyPositions[0].id)
      }

      const decimal = Number(coinConfig?.decimal)

      // Merge LP positions
      const mergedPosition = mergeLpPositions(
        tx,
        coinConfig,
        marketPositions,
        lpValue,
        decimal,
      )

      const lpAmount = new Decimal(lpValue).mul(10 ** decimal).toFixed()

      console.log("mergedPosition", mergedPosition)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::market::burn_lp`,
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
        typeArguments: [coinConfig.syCoinType],
      }

      const syCoin = tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(lpAmount),
          pyPosition,
          tx.object(coinConfig.marketStateId),
          mergedPosition,
          tx.object("0x6"),
        ],
        typeArguments: moveCallInfo.typeArguments,
      })

      // Add redeemSyCoin and conditionally burnSCoin based on receivingType
      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      // Use coin::value to get the output amount based on receivingType
      if (receivingType === "underlying") {
        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [underlyingCoin],
          typeArguments: [coinConfig.underlyingCoinType],
        })
      } else {
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [yieldToken],
          typeArguments: [coinConfig.coinType],
        })
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
        rawResult: result,
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "useBurnLpDryRun Failed to get output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      if (!result?.events?.[0]?.parsedJson) {
        const message = "useBurnLpDryRun Failed to get pt amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const outputValue = new Decimal(outputAmount)
        .div(10 ** decimal)
        .toFixed(decimal)

      const syAmount = result.events[0].parsedJson.sy_amount as string
      const syValue = new Decimal(syAmount).div(10 ** decimal).toFixed(decimal)

      const ptAmount = result.events[0].parsedJson.pt_amount as string
      const ptValue = new Decimal(ptAmount).div(10 ** decimal).toFixed(decimal)

      debugInfo.parsedOutput = JSON.stringify({
        syAmount,
        ptAmount,
        outputAmount,
        outputValue,
        syValue,
        ptValue,
      })

      const returnValue = {
        syAmount,
        ptAmount,
        outputAmount,
        outputValue,
        syValue,
        ptValue,
      }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
