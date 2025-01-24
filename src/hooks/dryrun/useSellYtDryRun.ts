import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import Decimal from "decimal.js"
import type { PyPosition } from "../types"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  initPyPosition,
  getPriceVoucher,
  swapExactYtForSy,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"
import useQuerySyOutFromYtInWithVoucher from "../useQuerySyOutFromYtInWithVoucher"

type SellResult = {
  syAmount: string
  underlyingAmount: string
}

export default function useSellYtDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)
  const { mutateAsync: querySyOutFromYt } =
    useQuerySyOutFromYtInWithVoucher(coinConfig)

  return useMutation({
    mutationFn: async ({
      sellValue,
      receivingType,
      slippage,
      pyPositions: inputPyPositions,
    }: {
      sellValue: string
      receivingType: "underlying" | "sy"
      slippage: string
      pyPositions?: PyPosition[]
    }): Promise<[SellResult] | [SellResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      // console.log("inputPyPositions in dry run:", inputPyPositions)

      const pyPositions =
        inputPyPositions ??
        ((await fetchPyPositionAsync()) as [PyPosition[]])[0]

      const tx = new Transaction()
      tx.setSender(address)

      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const amount = new Decimal(sellValue)
        .mul(new Decimal(10).pow(coinConfig.decimal))
        .toString()

      const redeemAmount = new Decimal(sellValue)
        .mul(10 ** Number(coinConfig.decimal))
        .toString()
      console.log("redeemAmount", redeemAmount)

      const [syOut] = await querySyOutFromYt(redeemAmount)

      console.log("syOut", syOut)

      const minSyOut = new Decimal(syOut)
        .mul(10 ** Number(coinConfig.decimal))
        .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
        .toFixed(0)

      console.log("params", {
        tx,
        coinConfig,
        amount,
        pyPosition,
        priceVoucher,
        minSyOut,
      })

      const syCoin = swapExactYtForSy(
        tx,
        coinConfig,
        amount,
        pyPosition,
        priceVoucher,
        minSyOut,
      )

      // tx.transferObjects([syCoin], address)

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

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const dryRunDebugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::router::swap_exact_yt_for_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "amount", value: amount },
            { name: "min_sy_out", value: minSyOut },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id,
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
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
      }

      if (result?.error) {
        throw new ContractError(result.error, dryRunDebugInfo)
      }

      if (!result?.events?.[0]?.parsedJson) {
        const message = "Failed to get sell YT data"
        dryRunDebugInfo.rawResult = {
          error: message,
          results: result?.results,
        }
        throw new ContractError(message, dryRunDebugInfo)
      }

      const syAmount = result.events[0].parsedJson.sy_amount as string
      const underlyingAmount =
        receivingType === "underlying"
          ? new Decimal(syAmount).mul(coinConfig.conversionRate).toFixed(0)
          : syAmount

      dryRunDebugInfo.parsedOutput = JSON.stringify({
        syAmount,
        underlyingAmount,
      })

      const returnValue = { syAmount, underlyingAmount }

      return debug ? [returnValue, dryRunDebugInfo] : [returnValue]
    },
  })
}
