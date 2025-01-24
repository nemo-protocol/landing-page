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
  swapExactPtForSy,
  redeemSyCoin,
  burnSCoin,
} from "@/lib/txHelper"

type SellResult = {
  syAmount: string
  underlyingAmount: string
}

export default function useSellPtDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      sellValue,
      receivingType,
      pyPositions: inputPyPositions,
    }: {
      sellValue: string
      receivingType: "underlying" | "sy"
      pyPositions?: PyPosition[]
    }): Promise<[SellResult] | [SellResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const [pyPositions] = !inputPyPositions
        ? ((await fetchPyPositionAsync()) as [PyPosition[]])
        : [inputPyPositions]

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

      const syCoin = swapExactPtForSy(
        tx,
        coinConfig,
        amount,
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

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const dryRunDebugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "amount", value: amount },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id,
            },
            { name: "py_state", value: coinConfig.pyStateId },
            { name: "price_voucher", value: "priceVoucher" },
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
        const message = "Failed to get sell PT data"
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
