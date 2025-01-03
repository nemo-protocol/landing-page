import Decimal from "decimal.js"
import { getSwapRatio } from "@/queries"
import { useQuery} from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useQueryYtOutBySyInWithVoucher from "./useQueryYtOutBySyInWithVoucher"
import { useRef } from "react"

export function useTradeRatios(coinConfig?: CoinConfig) {
  const lastPowerRef = useRef(0)
  const { mutateAsync: queryYtOut } = useQueryYtOutBySyInWithVoucher(coinConfig)

  return useQuery({
    queryKey: ["tradeRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      const decimal = coinConfig!.decimal

      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<{ ratio: string; conversionRate: string }> => {
        if (power >= decimal) return { ratio: "", conversionRate: "" }

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const amount = new Decimal(10).pow(safeDecimal).toString()
          const [ytOut] = await queryYtOut(amount)
          const ytRatio = new Decimal(ytOut).div(amount).toString()
          const swapRatioData = await getSwapRatio(
            coinConfig!.marketStateId,
            "yt",
            "buy",
          )

          lastPowerRef.current = power
          if (ytRatio === "0" && power < decimal) {
            return calculateRatio(power + 1)
          }
          return {
            ratio: ytRatio,
            conversionRate: swapRatioData.conversionRate,
          }
        } catch (error) {
          if (power < decimal) {
            return calculateRatio(power + 1)
          }
          throw error
        }
      }

      return calculateRatio()
    },
    enabled: !!coinConfig?.decimal && !!coinConfig?.marketStateId,
    refetchInterval: 20000,
  })
}
