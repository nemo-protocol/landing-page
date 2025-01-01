import Decimal from "decimal.js"
import { getSwapRatio } from "@/queries"
import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useQueryPtOutBySyInWithVoucher from "./useQueryPtOutBySyInWithVoucher"
import { useRef } from "react"

export function useInvestRatios(coinConfig?: CoinConfig) {
  const lastPowerRef = useRef(0)
  const { mutateAsync: queryPtOut } = useQueryPtOutBySyInWithVoucher(coinConfig)

  return useQuery({
    queryKey: ["investRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      const decimal = coinConfig!.decimal

      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<{ ratio: string; conversionRate: string }> => {
        if (power >= decimal) return { ratio: "", conversionRate: "" }

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const amount = new Decimal(10).pow(safeDecimal).toString()
          const [ptOut] = await queryPtOut(amount)
          const ptRatio = new Decimal(ptOut).div(amount).toString()
          const swapRatioData = await getSwapRatio(
            coinConfig!.marketStateId,
            "pt",
            "buy",
          )

          lastPowerRef.current = power
          return {
            ratio: ptRatio,
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
