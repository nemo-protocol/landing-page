import { DEBUG } from "@/config"
import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import useFetchPyPosition from "../useFetchPyPosition"
import type { PyPosition } from "../types"
import {
  mintSCoin,
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  splitCoinHelper,
} from "@/lib/txHelper"

interface AddLiquiditySingleSyParams {
  addAmount: string
  tokenType: number
  coinData: CoinData[]
  pyPositions?: PyPosition[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useAddLiquiditySingleSyDryRun<
  T extends boolean = false,
>(coinConfig?: CoinConfig, debug: T = false as T) {
  const client = useSuiClient()
  const { address } = useWallet()
  const { mutateAsync: fetchPyPositionAsync } = useFetchPyPosition(coinConfig)

  return useMutation({
    mutationFn: async ({
      coinData,
      addAmount,
      tokenType,
      pyPositions: inputPyPositions,
    }: AddLiquiditySingleSyParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      const [pyPositions] = (
        inputPyPositions ? [inputPyPositions] : await fetchPyPositionAsync()
      ) as [PyPosition[]]

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

      const [splitCoin] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [addAmount])
          : splitCoinHelper(tx, coinData, [addAmount], coinConfig.coinType)

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoin,
        coinConfig.coinType,
      )

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::router::add_liquidity_single_sy`,
          arguments: [
            { name: "version", value: coinConfig.version },
            { name: "sy_coin", value: "syCoin" },
            { name: "min_lp_amount", value: "0" },
            { name: "price_voucher", value: "priceVoucher" },
            {
              name: "py_position",
              value: pyPositions?.length ? pyPositions[0].id : "pyPosition",
            },
            { name: "py_state", value: coinConfig.pyStateId },
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

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          tx.pure.u64(0),
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
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

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        if (DEBUG) {
          console.log("debugInfo", debugInfo, coinConfig)
        }
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.events?.[result?.events?.length - 1]?.parsedJson) {
        const message = "Failed to get add liquidity data"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const lpAmount = result.events[result.events.length - 1].parsedJson
        .lp_amount as string

      debugInfo.parsedOutput = lpAmount

      return (debug ? [lpAmount, debugInfo] : lpAmount) as DryRunResult<T>
    },
  })
}
