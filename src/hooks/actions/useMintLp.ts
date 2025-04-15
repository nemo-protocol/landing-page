import { CoinData } from "@/types"
import { debugLog } from "@/config"
import { MarketState } from "../types"
import { CoinConfig } from "@/queries/types/market"
import { useMutation } from "@tanstack/react-query"
import { mintMultiSCoin } from "@/lib/txHelper/coin"
import { getPriceVoucher } from "@/lib/txHelper/price"
import type { DebugInfo, MoveCallInfo } from "../types"
import useFetchLpPosition from "@/hooks/useFetchLpPosition"
import useMintSCoinDryRun from "@/hooks/dryRun/useMintSCoinDryRun"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import { useEstimateLpOutDryRun } from "../dryRun/lp/useEstimateLpOutDryRun"
import {
  mintPY,
  redeemSyCoin,
  depositSyCoin,
  splitCoinHelper,
  mergeAllLpPositions,
} from "@/lib/txHelper"
import Decimal from "decimal.js"

interface MintLpParams {
  tx: Transaction
  address: string
  vaultId?: string
  slippage: string
  addAmount: string
  tokenType: number
  minLpAmount: string
  coinData: CoinData[]
  coinConfig: CoinConfig
  pyPosition: TransactionArgument
}

type DryRunResult<T extends boolean> = T extends true ? DebugInfo : void

export function useMintLp<T extends boolean = false>(
  coinConfig?: CoinConfig,
  marketState?: MarketState,
  debug: T = false as T,
) {
  const { mutateAsync: estimateLpOut } = useEstimateLpOutDryRun(
    coinConfig,
    marketState,
  )
  const { mutateAsync: fetchLpPositions } = useFetchLpPosition(coinConfig, true)

  const { mutateAsync: mintCoin } = useMintSCoinDryRun(coinConfig, false)

  return useMutation({
    mutationFn: async ({
      tx,
      vaultId,
      slippage,
      address,
      coinData,
      tokenType,
      addAmount,
      pyPosition,
      coinConfig,
      minLpAmount,
    }: MintLpParams): Promise<DryRunResult<T>> => {
      const { coinAmount } = await mintCoin({
        vaultId,
        coinData,
        slippage,
        amount: addAmount,
      })

      const lpOut = await estimateLpOut(addAmount)

      const [[splitCoinForSy, splitCoinForPt, sCoin], mintSCoinMoveCall] =
        tokenType === 0
          ? await mintMultiSCoin({
              tx,
              vaultId,
              address,
              slippage,
              coinData,
              coinConfig,
              debug: true,
              amount: addAmount,
              splitAmounts: [
                new Decimal(lpOut.syValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0, Decimal.ROUND_HALF_UP),
                new Decimal(lpOut.syForPtValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0, Decimal.ROUND_HALF_UP),
              ],
            })
          : [
              splitCoinHelper(
                tx,
                coinData,
                [
                  new Decimal(lpOut.syValue).toFixed(0, Decimal.ROUND_HALF_UP),
                  new Decimal(lpOut.syForPtValue).toFixed(
                    0,
                    Decimal.ROUND_HALF_UP,
                  ),
                ],
                coinConfig.coinType,
              ),
              [] as MoveCallInfo[],
            ]

      if (tokenType === 0) {
        tx.transferObjects([sCoin], address)
      }

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForSy,
        coinConfig.coinType,
      )

      const pyCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForPt,
        coinConfig.coinType,
      )

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )
      const [pt_amount] = mintPY(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition,
      )

      const [priceVoucherForMintLp, priceVoucherForMintLpMoveCall] =
        getPriceVoucher(tx, coinConfig)

      const mintLpMoveCall = {
        target: `${coinConfig.nemoContractId}::market::mint_lp`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "pt_amount", value: "pt_amount" },
          { name: "min_lp_amount", value: minLpAmount },
          { name: "price_voucher", value: "priceVoucherForMintLp" },
          { name: "py_position", value: "pyPosition" },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      const [remainingSyCoin, marketPosition] = tx.moveCall({
        ...mintLpMoveCall,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          pt_amount,
          tx.pure.u64(minLpAmount),
          priceVoucherForMintLp,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
      })

      const yieldToken = redeemSyCoin(tx, coinConfig, remainingSyCoin)

      const [lpPositions, lpPositionsDebugInfo] = await fetchLpPositions()

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        marketPosition,
      )

      tx.transferObjects([yieldToken, mergedPosition], address)

      const debugInfo: DebugInfo = {
        moveCall: [
          ...mintSCoinMoveCall,
          priceVoucherMoveCall,
          priceVoucherForMintLpMoveCall,
          mintLpMoveCall,
          ...lpPositionsDebugInfo.moveCall,
        ],
        rawResult: {},
      }

      if (!debug) {
        debugLog("mint lp debug info:", debugInfo)
      }

      return (debug ? debugInfo : undefined) as DryRunResult<T>
    },
  })
}
