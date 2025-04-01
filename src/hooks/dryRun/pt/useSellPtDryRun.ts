import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../../types"
import { ContractError } from "../../types"
import type { PyPosition } from "../../types"
import {
  initPyPosition,
  swapExactPtForSy,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"
import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"
import { UNSUPPORTED_UNDERLYING_COINS } from "@/lib/constants"
import { getPriceVoucher } from "@/lib/txHelper/price"

interface SellPtParams {
  minSyOut: string
  ptAmount: string
  pyPositions?: PyPosition[]
  receivingType: "underlying" | "sy"
}

type Result = { outputValue: string; outputAmount: string; syAmount: string }

type DryRunResult<T extends boolean> = T extends true
  ? [Result, DebugInfo]
  : Result

export default function useSellPtDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      minSyOut,
      ptAmount,
      receivingType,
      pyPositions: inputPyPositions,
    }: SellPtParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      let pyPosition
      let created = false
      if (!inputPyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(inputPyPositions[0].id)
      }

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const [syCoin, moveCallInfo] = swapExactPtForSy(
        tx,
        coinConfig,
        ptAmount,
        pyPosition,
        priceVoucher,
        minSyOut,
        true,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      if (
        receivingType === "underlying" &&
        !UNSUPPORTED_UNDERLYING_COINS.includes(coinConfig?.coinType)
      ) {
        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [underlyingCoin],
          typeArguments: [coinConfig.underlyingCoinType],
        })
      } else {
        // tx.transferObjects([yieldToken], address)
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [yieldToken],
          typeArguments: [coinConfig.coinType],
        })
      }

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, moveCallInfo],
        rawResult: result,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      if (!result.events[1].parsedJson.amount_out) {
        const message = "Failed to get sy amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const syAmount = result.events[1].parsedJson.amount_out

      const decimal = Number(coinConfig.decimal)

      const outputValue = new Decimal(outputAmount)
        .div(10 ** decimal)
        .toFixed(decimal)

      debugInfo.parsedOutput = outputValue

      const resultObj = { outputValue, outputAmount, syAmount }

      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
