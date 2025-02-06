import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../types"
import { ContractError } from "../types"
import useFetchPyPosition from "../useFetchPyPosition"
import {
  initPyPosition,
  getPriceVoucher,
  swapExactPtForSy,
} from "@/lib/txHelper"
import Decimal from "decimal.js"

type SwapResult = {
  syAmount: string
}

export default function useSwapExactPtForSyDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      redeemValue,
    }: {
      redeemValue: string
    }): Promise<[SwapResult] | [SwapResult, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const [pyPositions] = (await fetchPyPositionAsync()) as [PyPosition[]]

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

      // Get price voucher
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::market::swap_exact_pt_for_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            {
              name: "redeem_value",
              value: new Decimal(redeemValue)
                .mul(10 ** Number(coinConfig.decimal))
                .toFixed(0),
            },
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
      }

      swapExactPtForSy(
        tx,
        coinConfig,
        redeemValue,
        pyPosition,
        priceVoucher,
        "0",
      )

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

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[0]?.parsedJson) {
        const message = "Failed to get swap data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const syAmount = result.events[0].parsedJson.sy_amount as string

      //   console.log("syAmount", syAmount)

      debugInfo.parsedOutput = JSON.stringify({ syAmount })

      const returnValue = { syAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
