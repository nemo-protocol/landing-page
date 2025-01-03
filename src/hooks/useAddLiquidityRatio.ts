import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { getLPRatio } from "@/queries"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import { useRef } from "react"
import { splitSyAmount } from "@/lib/utils"
import useMarketStateData from "@/hooks/useMarketStateData.ts"
import useGetObject from "@/hooks/useGetObject.ts"
import { useQueryPriceVoucher } from "@/hooks/index.tsx"

export function useAddLiquidityRatio(coinConfig?: CoinConfig) {
  const lastPowerRef = useRef(0)
  const { address } = useWallet()
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
  const {data: marketState } =   useMarketStateData(coinConfig?.marketStateId)
  const {mutateAsync: exchangeRateFun} = useGetObject(coinConfig?.pyStateId, false, )
  const {mutateAsync: priceVoucherFun} = useQueryPriceVoucher(coinConfig, false)

  return useQuery({
    queryKey: ["addLiquidityRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (marketState === undefined) {
        throw new Error("not found market")
      }
      const exchangeRate = await exchangeRateFun({objectId: coinConfig.pyStateId, options: { showContent: true }})
      const priceVoucher = await priceVoucherFun()
      const decimal = coinConfig.decimal
      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<{ ratio: string; conversionRate: string }> => {
        if (power >= decimal) return { ratio: "", conversionRate: "" }

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const baseAmount = new Decimal(10).pow(safeDecimal).toString()
          const parsedData = JSON.parse(exchangeRate.toString())
          const { ptValue, syValue } = splitSyAmount(baseAmount, marketState.lpSupply, marketState.totalSy, marketState.totalPt, parsedData?.content?.fields?.py_index_stored?.fields?.value, priceVoucher.toString())
          let lpAmount: string
          if (marketState.lpSupply == "0") {
            lpAmount = (Math.sqrt(Number(ptValue) * Number(syValue)) - 1000 ).toString();
          }else{
            [lpAmount] = await queryLpOut({
              ptValue,
              syValue,
            })
          }

          const ratio = new Decimal(lpAmount).div(baseAmount).toString()
          const { conversionRate } = await getLPRatio(
            coinConfig.marketStateId,
            address,
          )

          lastPowerRef.current = power
          return { ratio, conversionRate }
        } catch (error) {
          if (power < decimal) {
            return calculateRatio(power + 1)
          }
          throw error
        }
      }

      return calculateRatio()
    },
    enabled: !!coinConfig?.decimal && !!coinConfig?.marketStateId && !!address,
    refetchInterval: 20000,
  })
}
