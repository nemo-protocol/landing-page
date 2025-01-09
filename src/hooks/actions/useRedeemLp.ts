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
import { LPMarketPosition, PyPosition } from "@/hooks/types"
import useSwapExactSyForPtDryRun from "@/hooks/dryrun/useSwapExactSyForPtDryRun"

interface RedeemLpParams {
  lpAmount: string
  coinConfig: CoinConfig
  lpMarketPositionData: LPMarketPosition[]
  pyPositionData: PyPosition[]
}

export default function useRedeemLp(coinConfig?: CoinConfig) {
  const { account, signAndExecuteTransaction } = useWallet()
  const address = account?.address

  const { mutateAsync: burnLpDryRun } = useBurnLpDryRun(coinConfig)
  const { mutateAsync: swapExactSyForPtDryRun } =
    useSwapExactSyForPtDryRun(coinConfig)

  const redeemLp = useCallback(
    async ({
      lpAmount,
      coinConfig,
      lpMarketPositionData,
      pyPositionData = [],
    }: RedeemLpParams) => {
      if (
        !address ||
        !coinConfig?.coinType ||
        !lpAmount ||
        !lpMarketPositionData?.length
      ) {
        throw new Error("Invalid parameters for redeeming LP")
      }

      const decimal = Number(coinConfig?.decimal)

      // First check if we can swap PT
      const [{ ptAmount }] = await burnLpDryRun(lpAmount)

      let canSwapPt = false
      if (ptAmount && new Decimal(ptAmount).gt(0)) {
        try {
          await swapExactSyForPtDryRun({
            tokenType: 0,
            swapAmount: ptAmount,
            coinData: [],
            coinType: coinConfig.coinType,
            minPtOut: "0",
          })
          canSwapPt = true
        } catch (error) {
          // If swap simulation fails, just continue without PT swap
          canSwapPt = false
        }
      }

      const tx = new Transaction()

      let pyPosition
      let created = false
      if (!pyPositionData?.length) {
        created = true
        pyPosition = initPyPosition(tx, coinConfig)
      } else {
        pyPosition = tx.object(pyPositionData[0].id.id)
      }

      const mergedPositionId = mergeLpPositions(
        tx,
        coinConfig,
        lpMarketPositionData,
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
    [address, burnLpDryRun, signAndExecuteTransaction, swapExactSyForPtDryRun],
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
