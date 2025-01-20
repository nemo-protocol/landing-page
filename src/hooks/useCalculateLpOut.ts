import Decimal from "decimal.js"
import { splitSyAmount } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useFetchObject from "@/hooks/useFetchObject.ts"
import { useQueryPriceVoucher } from "@/hooks/index.tsx"
import useMarketStateData from "@/hooks/useMarketStateData.ts"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"

export function useCalculateLpOut(coinConfig?: CoinConfig) {
  const { address } = useWallet()
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
  const { data: marketState } = useMarketStateData(coinConfig?.marketStateId)
  const { mutateAsync: exchangeRateFun } = useFetchObject(
    coinConfig?.pyStateId,
    false,
  )
  const { mutateAsync: priceVoucherFun } = useQueryPriceVoucher(
    coinConfig,
    false,
  )
  return useMutation({
    mutationFn: async (syAmount: string) => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!marketState) {
        // console.log(marketState)
        throw new Error("not found market")
      }
      const exchangeRate = await exchangeRateFun({
        objectId: coinConfig.pyStateId,
        options: { showContent: true },
      })
      const priceVoucher = await priceVoucherFun()
      const parsedData = JSON.parse(exchangeRate.toString())
      const { syForPtValue, syValue, ptValue } = splitSyAmount(
        syAmount,
        marketState.lpSupply,
        marketState.totalSy,
        marketState.totalPt,
        parsedData?.content?.fields?.py_index_stored?.fields?.value,
        priceVoucher.toString(),
      )

      const lpAmount =
        marketState.lpSupply == "0"
          ? (Math.sqrt(Number(ptValue) * Number(syValue)) - 1000).toString()
          : (await queryLpOut({ ptValue, syValue }))[0]

      return {
        lpAmount: new Decimal(lpAmount)
          .div(10 ** Number(coinConfig?.decimal))
          .toString(),
        ptValue,
        syValue,
        syForPtValue,
      }
    },
  })
}
