import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, MoveCallInfo, PyPosition } from "../types"
import { ContractError } from "../types"
import useFetchLpPosition from "../useFetchLpPosition"
import useFetchPyPosition from "../useFetchPyPosition"
import { initPyPosition, mergeLpPositions, redeemSyCoin } from "@/lib/txHelper"
import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"
import { debugLog } from "@/config"
import { getCoinValue } from "@/lib/txHelper/coin"

type Result = { coinValue: string; coinAmount: string }

type DryRunResult<T extends boolean> = T extends true
  ? [Result, DebugInfo]
  : Result

export default function useBurnSCoinDryRun<T extends boolean = false>(
  outerCoinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchLpPositionAsync } =
    useFetchLpPosition(outerCoinConfig)
  const { mutateAsync: fetchPyPositionAsync } =
    useFetchPyPosition(outerCoinConfig)

  return useMutation({
    mutationFn: async (
      { lpAmount }: { lpAmount: string },
      innerConfig?: CoinConfig,
    ): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }

      const coinConfig = innerConfig || outerCoinConfig
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

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

      // Merge LP positions
      const mergedPosition = mergeLpPositions(
        tx,
        coinConfig,
        marketPositions,
        lpAmount,
      )

      const moveCallInfos: MoveCallInfo[] = []

      const burnLpmoveCallInfo = {
        target: `${coinConfig.nemoContractId}::market::burn_lp`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "lp_amount", value: lpAmount },
          {
            name: "py_position",
            value: created ? "pyPosition" : pyPositions[0].id,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "market_position", value: marketPositions[0].id.id },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      moveCallInfos.push(burnLpmoveCallInfo)

      const syCoin = tx.moveCall({
        target: burnLpmoveCallInfo.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(lpAmount),
          pyPosition,
          tx.object(coinConfig.marketStateId),
          mergedPosition,
          tx.object("0x6"),
        ],
        typeArguments: burnLpmoveCallInfo.typeArguments,
      })

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      const [, getCoinValueMoveCallInfo] = getCoinValue(
        tx,
        yieldToken,
        coinConfig.coinType,
        true,
      )

      moveCallInfos.push(getCoinValueMoveCallInfo)

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: moveCallInfos,
        rawResult: result,
      }

      if (result?.error) {
        debugLog(`useBurnSCoinDryRun error:`, debugInfo)
        throw new ContractError(result.error, debugInfo)
      }

      if (!debug) {
        debugLog(`useBurnSCoinDryRun debug info:`, debugInfo)
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get coin amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const coinAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const decimal = Number(coinConfig.decimal)

      const coinValue = new Decimal(coinAmount)
        .div(10 ** decimal)
        .toFixed(decimal)

      debugInfo.parsedOutput = coinValue

      const resultObj = {
        coinValue,
        coinAmount,
      }

      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
