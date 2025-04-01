import { CoinConfig } from "@/queries/types/market"
import { CoinData } from "@/types"
import {
  mintSCoin,
  depositSyCoin,
  splitCoinHelper,
  mergeAllLpPositions,
} from "@/lib/txHelper"
import { debugLog } from "@/config"
import { safeDivide } from "@/lib/utils"
import useAddLiquiditySinglePtDryRun from "@/hooks/dryRun/lp/useAddLiquiditySinglePtDryRun"
import useFetchLpPosition from "@/hooks/useFetchLpPosition"
import { useMutation } from "@tanstack/react-query"
import type { DebugInfo } from "../types"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import { getPriceVoucher } from "@/lib/txHelper/price"

interface AddLiquiditySingleSyParams {
  tx: Transaction
  addAmount: string
  tokenType: number
  coinConfig: CoinConfig
  coinData: CoinData[]
  coinType: string
  pyPosition: TransactionArgument
  address: string
  minLpAmount: string
  conversionRate: string
}

type DryRunResult<T extends boolean> = T extends true ? DebugInfo : void

export function useAddLiquiditySingleSy<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const { mutateAsync: addLiquiditySinglePtDryRun } =
    useAddLiquiditySinglePtDryRun(coinConfig, true)

  const { mutateAsync: fetchLpPositions } = useFetchLpPosition(coinConfig, true)

  return useMutation({
    mutationFn: async ({
      tx,
      addAmount,
      tokenType,
      coinConfig,
      coinData,
      coinType,
      pyPosition,
      address,
      minLpAmount,
      conversionRate,
    }: AddLiquiditySingleSyParams): Promise<DryRunResult<T>> => {
      const [splitCoin] =
        tokenType === 0
          ? mintSCoin(tx, coinConfig, coinData, [addAmount])
          : splitCoinHelper(tx, coinData, [addAmount], coinType)

      const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

      const syAmount =
        tokenType === 0
          ? safeDivide(addAmount, conversionRate, "decimal").toFixed(0)
          : addAmount

      const [ptValue, addLiquiditySinglePtMoveCall] =
        await addLiquiditySinglePtDryRun({
          netSyIn: syAmount,
          coinData,
        })

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const addLiquidityMoveCall = {
        target: `${coinConfig.nemoContractId}::router::add_liquidity_single_sy`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "pt_value", value: ptValue },
          { name: "min_lp_amount", value: minLpAmount },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_position", value: "pyPosition" },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const [mp] = tx.moveCall({
        target: addLiquidityMoveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          tx.pure.u64(ptValue),
          tx.pure.u64(minLpAmount),
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: addLiquidityMoveCall.typeArguments,
      })

      const [lpPositions, lpPositionsDebugInfo] = await fetchLpPositions()

      const debugInfo: DebugInfo = {
        moveCall: [
          ...addLiquiditySinglePtMoveCall.moveCall,
          priceVoucherMoveCall,
          addLiquidityMoveCall,
        ],
        rawResult: {},
      }

      debugInfo.moveCall = [
        ...addLiquiditySinglePtMoveCall.moveCall,
        priceVoucherMoveCall,
        addLiquidityMoveCall,
        ...lpPositionsDebugInfo.moveCall,
      ]

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        mp,
      )

      tx.transferObjects([mergedPosition], address)

      if (!debug) {
        debugLog("add_liquidity_single_sy debugInfo:", debugInfo)
      }

      return (debug ? debugInfo : undefined) as DryRunResult<T>
    },
  })
}
