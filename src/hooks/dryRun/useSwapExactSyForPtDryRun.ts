import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import {
  depositSyCoin,
  initPyPosition,
  splitCoinHelper,
  swapExactSyForPt,
} from "@/lib/txHelper"
import useFetchPyPosition from "../useFetchPyPosition"
import type { PyPosition } from "../types"
import type { CoinData } from "@/types"
import Decimal from "decimal.js"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { mintSCoin } from "@/lib/txHelper/coin"

interface SwapParams {
  tokenType: number
  swapAmount: string
  coinData: CoinData[]
  coinType: string
  minPtOut: string
  approxPtOut: string
  pyPositions?: PyPosition[]
  slippage: string
  vaultId?: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useSwapExactSyForPtDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      vaultId,
      slippage,
      coinData,
      coinType,
      minPtOut,
      tokenType,
      swapAmount,
      approxPtOut,
      pyPositions: inputPyPositions,
    }: SwapParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [splitCoin] =
        tokenType === 0
          ? await mintSCoin({
              tx,
              address,
              vaultId,
              coinData,
              slippage,
              coinConfig,
              debug: true,
              amount: swapAmount,
            })
          : splitCoinHelper(tx, coinData, [swapAmount], coinType)

      const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

      const [pyPositions] = !inputPyPositions
        ? ((await fetchPyPositionAsync()) as [PyPosition[]])
        : [inputPyPositions]

      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = swapExactSyForPt(
        tx,
        coinConfig,
        syCoin,
        priceVoucher,
        pyPosition,
        minPtOut,
        approxPtOut,
        true,
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

      console.log("useSwapExactSyForPtDryRun result", result)

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
      }

      if (result?.error) {
        console.log("error", result.error)

        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result.events.length - 1]?.parsedJson) {
        const message = "Failed to get swap data"
        throw new ContractError(message, debugInfo)
      }

      const _ptValue = result.events[result.events.length - 1].parsedJson
        .pt_amount.value as string

      const decimal = Number(coinConfig.decimal)

      const ptValue = new Decimal(_ptValue)
        .div(new Decimal(2).pow(64))
        .div(10 ** decimal)
        .toFixed(decimal)

      debugInfo.parsedOutput = ptValue

      return (debug ? [ptValue, debugInfo] : ptValue) as DryRunResult<T>
    },
  })
}
