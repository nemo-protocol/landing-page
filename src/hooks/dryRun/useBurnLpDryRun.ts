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
import {
  NEED_MIN_VALUE_LIST,
  UNSUPPORTED_UNDERLYING_COINS,
} from "@/lib/constants"
import { debugLog } from "@/config"
import { burnSCoin } from "@/lib/txHelper/coin"
import { formatDecimalValue } from "@/lib/utils"

type BurnLpResult = {
  ptAmount: string
  syAmount: string
  ptValue: string
  syValue: string
  outputValue: string
  outputAmount: string
}

interface BurnLpParams {
  lpAmount: string
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
      { lpAmount, receivingType }: BurnLpParams,
      innerConfig?: CoinConfig,
    ): Promise<[BurnLpResult] | [BurnLpResult, DebugInfo]> => {
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

      const decimal = Number(coinConfig?.decimal)

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

      // Use coin::value to get the output amount based on receivingType
      if (
        receivingType === "underlying" &&
        !UNSUPPORTED_UNDERLYING_COINS.includes(coinConfig?.coinType) &&
        // FIXME: remove this
        coinConfig?.coinType !==
          "0xb1b0650a8862e30e3f604fd6c5838bc25464b8d3d827fbd58af7cb9685b832bf::wwal::WWAL"
      ) {
        const [underlyingCoin, burnMoveCallInfo] = burnSCoin({
          tx,
          address,
          coinConfig,
          debug: true,
          sCoin: yieldToken,
        })
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [underlyingCoin],
          typeArguments: [coinConfig.underlyingCoinType],
        })
        moveCallInfos.push(...burnMoveCallInfo)
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
        moveCall: moveCallInfos,
        rawResult: result,
      }

      debugLog("useBurnLpDryRun", debugInfo)

      if (result.error) {
        debugLog("useBurnLpDryRun error", debugInfo)
        throw new ContractError(result.error, debugInfo)
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

      const minValue =
        NEED_MIN_VALUE_LIST.find(
          (item) => item.coinType === coinConfig?.coinType,
        )?.minValue || 0

      if (
        receivingType === "underlying" &&
        new Decimal(outputValue).lt(minValue)
      ) {
        const lpValue = new Decimal(lpAmount).div(Decimal.pow(10, decimal))
        throw new ContractError(
          `Please at least enter ${formatDecimalValue(
            new Decimal(lpValue).div(outputValue),
            4,
          )} LP wWAL or try to withdraw to ${coinConfig.coinName}
          .`,
          debugInfo,
        )
      }

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
