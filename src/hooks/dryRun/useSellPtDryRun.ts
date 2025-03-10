import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import type { PyPosition } from "../types"
import {
  initPyPosition,
  getPriceVoucher,
  swapExactPtForSy,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"
import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"

interface SellPtParams {
  sellValue: string
  receivingType: "underlying" | "sy"
  pyPositions?: PyPosition[]
  minSyOut: string
}

type Result = { outputValue: string; syAmount: string }

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
      sellValue,
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

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const [syCoin, moveCallInfo] = swapExactPtForSy(
        tx,
        coinConfig,
        sellValue,
        pyPosition,
        priceVoucher,
        minSyOut,
        true,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      if (receivingType === "underlying") {
        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
        tx.moveCall({
          target: `0x2::coin::value`,
          arguments: [underlyingCoin],
          typeArguments: [coinConfig.underlyingCoinType],
        })
      } else {
        tx.transferObjects([yieldToken], address)
      }

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      console.log("result", result)

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[1]?.parsedJson) {
        const message = "Failed to get sy amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get sell PT data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount =
        receivingType === "underlying"
          ? bcs.U64.parse(
              new Uint8Array(
                result.results[result.results.length - 1].returnValues[0][0],
              ),
            )
          : result.events[result.events.length - 1].parsedJson.amount_out

      const syAmount = result.events[1].parsedJson.amount_out

      const decimal = Number(coinConfig.decimal)

      const outputValue = new Decimal(outputAmount)
        .div(10 ** decimal)
        .toString()

      debugInfo.parsedOutput = outputValue

      return (
        debug
          ? [{ outputValue, syAmount }, debugInfo]
          : { outputValue, syAmount }
      ) as DryRunResult<T>
    },
  })
}
