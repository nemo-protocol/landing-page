import { Transaction } from "@mysten/sui/transactions"
import { useCallback } from "react"
import { useWallet } from "@nemoprotocol/wallet-kit"
import Decimal from "decimal.js"
import { useMutation } from "@tanstack/react-query"
import { DEBUG } from "@/config"
import {
  initPyPosition,
  mergeLpPositions,
  burnLp,
  redeemSyCoin,
  getPriceVoucher,
  swapExactPtForSy,
} from "@/lib/txHelper"
import useBurnLpDryRun from "@/hooks/dryrun/useBurnLpDryRun"
import { CoinConfig } from "@/queries/types/market"
import { LpPosition, PyPosition } from "@/hooks/types"
import useSwapExactPtForSyDryRun from "@/hooks/dryrun/useSwapExactPtForSyDryRun"

interface RedeemLpParams {
  lpAmount: string
  coinConfig: CoinConfig
  lpPositions: LpPosition[]
  pyPositions: PyPosition[]
}

export default function useRedeemLp(coinConfig?: CoinConfig) {
  const { account, signAndExecuteTransaction } = useWallet()
  const address = account?.address

  const { mutateAsync: burnLpDryRun } = useBurnLpDryRun(coinConfig)
  const { mutateAsync: swapExactPtForSyDryRun } =
    useSwapExactPtForSyDryRun(coinConfig)

  const redeemLp = useCallback(
    async ({
      lpAmount,
      coinConfig,
      lpPositions,
      pyPositions = [],
    }: RedeemLpParams) => {
      if (
        !address ||
        !coinConfig?.coinType ||
        !lpAmount ||
        !lpPositions?.length
      ) {
        throw new Error("Invalid parameters for redeeming LP")
      }

      const decimal = Number(coinConfig?.decimal)

      // First check if we can swap PT
      const [{ ptAmount }] = await burnLpDryRun(lpAmount)

      let canSwapPt = false
      if (ptAmount && new Decimal(ptAmount).gt(0)) {
        try {
          await swapExactPtForSyDryRun({
            redeemValue: ptAmount,
          })

          canSwapPt = true
        } catch (error) {
          // If swap simulation fails, just continue without PT swap
          canSwapPt = false
        }
      }
      console.log("canSwapPt", canSwapPt)

      const tx = new Transaction()

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
        decimal,
      )

      const syCoin = burnLp(
        tx,
        coinConfig,
        lpAmount,
        pyPosition,
        mergedPositionId,
        decimal,
      )

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)
      tx.transferObjects([yieldToken], address)

      // Add PT swap if possible
      if (canSwapPt) {
        const [priceVoucher] = getPriceVoucher(tx, coinConfig)
        const swappedSyCoin = swapExactPtForSy(
          tx,
          coinConfig,
          new Decimal(ptAmount).div(10 ** decimal).toString(),
          pyPosition,
          priceVoucher,
        )

        const swappedYieldToken = redeemSyCoin(tx, coinConfig, swappedSyCoin)
        tx.transferObjects([swappedYieldToken], address)
      }

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const { digest } = await signAndExecuteTransaction({
        transaction: tx,
      })

      return { digest }
    },
    [address, burnLpDryRun, signAndExecuteTransaction, swapExactPtForSyDryRun],
  )

  return useMutation({
    mutationFn: redeemLp,
    onError: (error) => {
      if (DEBUG) {
        console.log("Redeem LP error:", error)
      }
    },
  })
}
