import Decimal from "decimal.js"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { splitSyAmount } from "@/lib/utils"
import useMarketStateData from "@/hooks/useMarketStateData.ts"
import useGetObject from "@/hooks/useGetObject.ts"
import { useQueryPriceVoucher } from "@/hooks/index.tsx"

export function useCalculateLpOut(coinConfig?: CoinConfig) {
  const { address } = useWallet()
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
  const {data: marketState } =   useMarketStateData(coinConfig?.marketStateId)
  const {mutateAsync: exchangeRateFun} = useGetObject(coinConfig?.pyStateId, false)
  const {mutateAsync: priceVoucherFun} = useQueryPriceVoucher(coinConfig, false)
  return useMutation({
    mutationFn: async (syAmount: string) => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!marketState) {
        console.log(marketState)
        throw new Error("not found market")
      }
        const exchangeRate = await exchangeRateFun({objectId: coinConfig.pyStateId})
      const priceVoucher = await priceVoucherFun()
      const parsedData = JSON.parse(exchangeRate.toString())
      const { ptValue, syValue } = splitSyAmount(syAmount, marketState.lpSupply, marketState.totalSy, marketState.totalPt, parsedData?.content?.fields?.py_index_stored?.fields?.value, priceVoucher.toString())
      console.log("syAmount", syAmount, "ptValue", ptValue, "syValue", syValue)

      const [lpAmount] = await queryLpOut({
        ptValue,
        syValue,
      })
      console.log("lpAmount", lpAmount)

      return new Decimal(lpAmount).div(10 ** coinConfig.decimal).toString()
    },
  })
}
