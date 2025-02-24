import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo, PyPosition } from "../types"
import { ContractError } from "../types"
import useFetchPyPosition from "../useFetchPyPosition"
import { initPyPosition, getPriceVoucher, mintSCoin, splitCoinHelper, depositSyCoin } from "@/lib/txHelper"
import { CoinData } from "../useCoinData"

type SwapResult = {
  ytAmount: string
}

export default function useSwapExactSyForYtDryRun(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      tokenType,
      swapAmount,
      coinData,
      coinType,
      minYtOut,
    }: {
      tokenType: number
      swapAmount: string
      coinData: CoinData[]
      coinType: string
      minYtOut: string
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

      const [splitCoin] =
      tokenType === 0
        ? mintSCoin(tx, coinConfig, coinData, [swapAmount])
        : splitCoinHelper(tx, coinData, [swapAmount], coinType)

      const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

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

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_yt`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "min_yt_out", value: minYtOut },
          { name: "sy_coin", value: "syCoin" },
          { name: "price_voucher", value: "priceVoucher" },
          {
            name: "py_position",
            value: created ? "pyPosition" : pyPositions[0].id,
          },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(minYtOut),
          syCoin,
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.yieldFactoryConfigId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: moveCallInfo.typeArguments,
      })

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

      console.log("result", result)

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[0]?.parsedJson) {
        const message = "Failed to get swap data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const ytAmount = result.events[0].parsedJson.yt_amount as string

      debugInfo.parsedOutput = JSON.stringify({ ytAmount })

      const returnValue = { ytAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
} 