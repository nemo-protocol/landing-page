import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import useFetchPyPosition, { type PyPosition } from "../useFetchPyPosition"
import { initPyPosition, getPriceVoucher, mintSycoin, splitCoinHelper, depositSyCoin } from "@/lib/txHelper"
import { CoinData } from "../useCoinData"

type SwapResult = {
  ptAmount: string
}

export default function useSwapExactSyForPtDryRun(
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
      minPtOut,
    }: {
      tokenType: number
      swapAmount: string
      coinData: CoinData[]
      coinType: string
      minPtOut: string
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
        ? mintSycoin(tx, coinConfig, coinData, [swapAmount])
        : splitCoinHelper(tx, coinData, [swapAmount], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

      // Handle py position creation
      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id.id)
      }

      // Get price voucher
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_pt`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "min_pt_out", value: minPtOut },
            { name: "sy_coin", value: "syCoin" },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "py_position",
              value: created ? "pyPosition" : pyPositions[0].id.id,
            },
            { name: "py_state", value: coinConfig.pyStateId },
            {
              name: "market_factory_config",
              value: coinConfig.marketFactoryConfigId,
            },
            { name: "market", value: coinConfig.marketStateId },
            { name: "clock", value: "0x6" },
          ],
          typeArguments: [coinConfig.syCoinType],
        },
      }

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.pure.u64(minPtOut),
          syCoin,
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: debugInfo.moveCall.typeArguments,
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

      const ptAmount = result.events[0].parsedJson.pt_amount as string

      debugInfo.parsedOutput = JSON.stringify({ ptAmount })

      const returnValue = { ptAmount }

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
