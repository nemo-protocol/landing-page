import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import Decimal from "decimal.js"
import type { PyPosition } from "../types"
import {
  initPyPosition,
  getPriceVoucher,
  swapExactYtForSy,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"
import useQuerySyOutFromYtInWithVoucher from "../useQuerySyOutFromYtInWithVoucher"

interface SellYtParams {
  sellValue: string
  receivingType: "underlying" | "sy"
  slippage: string
  pyPositions?: PyPosition[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useSellYtDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: querySyOutFromYt } =
    useQuerySyOutFromYtInWithVoucher(coinConfig)

  return useMutation({
    mutationFn: async ({
      slippage,
      sellValue,
      receivingType,
      pyPositions: inputPyPositions,
    }: SellYtParams): Promise<DryRunResult<T>> => {
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

      const amount = new Decimal(sellValue)
        .mul(new Decimal(10).pow(coinConfig.decimal))
        .toString()

      const [syOut] = await querySyOutFromYt(amount)

      const minSyOut = new Decimal(syOut)
        .mul(10 ** Number(coinConfig.decimal))
        .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
        .toFixed(0)

      const syCoin = swapExactYtForSy(
        tx,
        coinConfig,
        amount,
        pyPosition,
        priceVoucher,
        minSyOut,
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
          target: `${coinConfig.nemoContractId}::router::swap_exact_yt_for_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "amount", value: amount },
            { name: "min_sy_out", value: minSyOut },
            {
              name: "py_position",
              value: inputPyPositions?.length ? inputPyPositions[0].id : "pyPosition",
            },
            { name: "py_state", value: coinConfig.pyStateId },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "yield_factory_config",
              value: coinConfig.yieldFactoryConfigId,
            },
            {
              name: "market_factory_config",
              value: coinConfig.marketFactoryConfigId,
            },
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

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[0]?.parsedJson) {
        const message = "Failed to get sell YT data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = result.events[0].parsedJson.sy_amount as string

      debugInfo.parsedOutput = syAmount

      return (debug ? [syAmount, debugInfo] : syAmount) as DryRunResult<T>
    },
  })
}
