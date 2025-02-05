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

interface SellPtParams {
  sellValue: string
  receivingType: "underlying" | "sy"
  pyPositions?: PyPosition[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useSellPtDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      sellValue,
      receivingType,
      pyPositions: inputPyPositions,
    }: SellPtParams): Promise<DryRunResult<T>> => {
      console.log("sellValue", sellValue)
      console.log("receivingType", receivingType)
      console.log("pyPositions", inputPyPositions)

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

      const syCoin = swapExactPtForSy(
        tx,
        coinConfig,
        sellValue,
        pyPosition,
        priceVoucher,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      if (receivingType === "underlying") {
        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
        tx.transferObjects([underlyingCoin], address)
      } else {
        tx.transferObjects([yieldToken], address)
      }

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "pt_amount", value: sellValue },
            { name: "min_sy_out", value: "0" },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "py_position",
              value: inputPyPositions?.length
                ? inputPyPositions[0].id
                : "pyPosition",
            },
            { name: "py_state", value: coinConfig.pyStateId },
            { name: "market_state", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      console.log("result", result)

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get sell PT data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = result.events[result.events.length - 1].parsedJson
        .withdraw_amount as string

      const decimal = Number(coinConfig.decimal)

      const syOut = new Decimal(syAmount).div(10 ** decimal).toString()

      debugInfo.parsedOutput = syOut

      return (debug ? [syOut, debugInfo] : syOut) as DryRunResult<T>
    },
  })
}
