import Decimal from "decimal.js"
import { useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Transaction } from "@mysten/sui/transactions"
import { LpPosition, PyPosition, MarketState } from "@/hooks/types"
import useBurnLpDryRun from "@/hooks/dryRun/useBurnLpDryRun"
import useSwapExactPtForSyDryRun from "@/hooks/dryRun/useSwapExactPtForSyDryRun"
import useClaimLpReward from "./useClaimLpReward"
import {
  initPyPosition,
  mergeLpPositions,
  burnLp,
  redeemSyCoin,
  swapExactPtForSy,
} from "@/lib/txHelper"
import { UNSUPPORTED_UNDERLYING_COINS } from "@/lib/constants"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { burnSCoin } from "@/lib/txHelper/coin"
import useBurnSCoinDryRun from "../dryRun/useBurnSCoinDryRun"

interface RedeemLpParams {
  lpAmount: string
  slippage: string
  vaultId?: string
  coinConfig: CoinConfig
  lpPositions: LpPosition[]
  pyPositions: PyPosition[]
  receivingType?: "underlying" | "sy"
}

export default function useRedeemLp(
  coinConfig?: CoinConfig,
  marketState?: MarketState,
) {
  const { account, signAndExecuteTransaction } = useWallet()
  const address = account?.address

  const { mutateAsync: burnLpDryRun } = useBurnLpDryRun(coinConfig)
  const { mutateAsync: burnSCoinDryRun } = useBurnSCoinDryRun(coinConfig)
  const { mutateAsync: swapExactPtForSyDryRun } =
    useSwapExactPtForSyDryRun(coinConfig)
  const { mutateAsync: claimLpRewardMutation } = useClaimLpReward(coinConfig)

  const redeemLp = useCallback(
    async ({
      vaultId,
      lpAmount,
      slippage,
      coinConfig,
      lpPositions,
      pyPositions = [],
      receivingType = "underlying",
    }: RedeemLpParams) => {
      if (
        !address ||
        !lpAmount ||
        !coinConfig?.coinType ||
        !lpPositions?.length
      ) {
        throw new Error("Invalid parameters for redeeming LP")
      }

      if (!marketState) {
        throw new Error("Market state is not available")
      }

      console.log("lpAmount", lpAmount)

      // First check if we can swap PT
      const [{ ptAmount }] = await burnLpDryRun({
        vaultId,
        lpAmount,
        slippage,
        receivingType,
      })

      let canSwapPt = false
      if (ptAmount && new Decimal(ptAmount).gt(0)) {
        try {
          await swapExactPtForSyDryRun(ptAmount)

          canSwapPt = true
        } catch (error) {
          // If swap simulation fails, just continue without PT swap
          canSwapPt = false
        }
      }

      const tx = new Transaction()

      // Claim all LP rewards first
      if (marketState?.rewardMetrics?.length) {
        for (const rewardMetric of marketState.rewardMetrics) {
          await claimLpRewardMutation({
            tx,
            coinConfig,
            lpPositions,
            rewardMetric,
          })
        }
      }

      let pyPosition
      let created = false
      if (!pyPositions?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositions[0].id)
      }

      const mergedPositionId = mergeLpPositions(
        tx,
        coinConfig,
        lpPositions,
        lpAmount,
      )

      const syCoin = burnLp(
        tx,
        coinConfig,
        lpAmount,
        pyPosition,
        mergedPositionId,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      // Add conditional logic for receivingType
      if (
        receivingType === "underlying" &&
        !UNSUPPORTED_UNDERLYING_COINS.includes(coinConfig?.coinType)
      ) {
        const { coinAmount: amount } = await burnSCoinDryRun({
          lpAmount,
        })
        const underlyingCoin = await burnSCoin({
          tx,
          amount,
          address,
          vaultId,
          slippage,
          coinConfig,
          sCoin: yieldToken,
        })
        tx.transferObjects([underlyingCoin], address)
      } else {
        tx.transferObjects([yieldToken], address)
      }

      // Add PT swap if possible
      if (canSwapPt) {
        const [priceVoucher] = getPriceVoucher(tx, coinConfig)
        const swappedSyCoin = swapExactPtForSy(
          tx,
          coinConfig,
          ptAmount,
          pyPosition,
          priceVoucher,
          // FIXME: confirm minSyOut
          "0",
        )

        const swappedYieldToken = redeemSyCoin(tx, coinConfig, swappedSyCoin)

        // Add conditional logic for receivingType for swapped PT
        if (
          receivingType === "underlying" &&
          !UNSUPPORTED_UNDERLYING_COINS.includes(coinConfig?.coinType)
        ) {
          const { coinAmount: amount } = await burnSCoinDryRun({
            lpAmount,
          })
          const swappedUnderlyingCoin = await burnSCoin({
            tx,
            amount,
            address,
            vaultId,
            slippage,
            coinConfig,
            sCoin: swappedYieldToken,
          })
          tx.transferObjects([swappedUnderlyingCoin], address)
        } else {
          tx.transferObjects([swappedYieldToken], address)
        }
      }

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const { digest } = await signAndExecuteTransaction({
        transaction: tx,
      })

      return { digest }
    },
    [
      address,
      marketState,
      burnLpDryRun,
      burnSCoinDryRun,
      claimLpRewardMutation,
      swapExactPtForSyDryRun,
      signAndExecuteTransaction,
    ],
  )

  return useMutation({
    mutationFn: redeemLp,
  })
}
