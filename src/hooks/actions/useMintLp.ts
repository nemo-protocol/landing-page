import useMintSCoinDryRun from "@/hooks/dryRun/useMintSCoinDryRun"
import { CoinConfig } from "@/queries/types/market"
import { CoinData } from "@/types"
import {
  depositSyCoin,
  splitCoinHelper,
  mergeAllLpPositions,
  mintPY,
  redeemSyCoin,
} from "@/lib/txHelper"
import { debugLog } from "@/config"
import useFetchLpPosition from "@/hooks/useFetchLpPosition"
import { useMutation } from "@tanstack/react-query"
import type { DebugInfo, MoveCallInfo } from "../types"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { useEstimateLpOutDryRun } from "../dryRun/lp/useEstimateLpOutDryRun"
import Decimal from "decimal.js"
import { MarketState } from "../types"
import { mintMultiSCoin } from "@/lib/txHelper/coin"

interface MintLpParams {
  tx: Transaction
  addAmount: string
  tokenType: number
  coinConfig: CoinConfig
  coinData: CoinData[]
  coinType: string
  pyPosition: TransactionArgument
  address: string
  minLpAmount: string
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
      address,
      coinType,
      coinData,
      tokenType,
      addAmount,
      pyPosition,
      coinConfig,
      minLpAmount,
    }: MintLpParams): Promise<DryRunResult<T>> => {
      const { coinAmount } = await mintCoin({ amount: addAmount, coinData })
      console.log("useMintCoinDryRun coinAmount:", coinAmount)
      const lpOut = await estimateLpOut(addAmount)

      const [[splitCoinForSy, splitCoinForPt], mintSCoinMoveCall] =
        tokenType === 0
          ? mintMultiSCoin({
              tx,
              coinData,
              coinConfig,
              debug: true,
              amount: addAmount,
              splitAmounts: [
                new Decimal(lpOut.syValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0),
                new Decimal(lpOut.syForPtValue)
                  .div(new Decimal(lpOut.syValue).plus(lpOut.syForPtValue))
                  .mul(coinAmount)
                  .toFixed(0),
              ],
            })
          : [
              splitCoinHelper(
                tx,
                coinData,
                [
                  new Decimal(lpOut.syValue).toFixed(0),
                  new Decimal(lpOut.syForPtValue).toFixed(0),
                ],
                coinConfig.coinType,
              ),
              [] as MoveCallInfo[],
            ]

      const syCoin = depositSyCoin(tx, coinConfig, splitCoinForSy, coinType)
      const pyCoin = depositSyCoin(tx, coinConfig, splitCoinForPt, coinType)

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
