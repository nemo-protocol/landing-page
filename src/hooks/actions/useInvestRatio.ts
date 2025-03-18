import { useRef } from "react"
import Decimal from "decimal.js"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useQueryPtOutBySyInWithVoucher from "../dryRun/pt/useQueryPtOutBySyIn"

export default function useInvestRatios(coinConfig?: CoinConfig) {
  const lastPowerRef = useRef(0)
  const { mutateAsync: queryPtOut } = useQueryPtOutBySyInWithVoucher({
    outerCoinConfig: coinConfig,
  })

  return useMutation({
    mutationFn: async (conversionRate: string) => {
      if (!coinConfig?.decimal) {
        throw new Error("Missing required configuration")
      }

      const decimal = 3

      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<string> => {
        if (power >= decimal) return ""

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const syAmount = new Decimal(10).pow(safeDecimal).toString()
          const { ptValue } = await queryPtOut({ syAmount })
          const ptRatio = new Decimal(ptValue)
            .div(syAmount)
            .div(conversionRate)
            .toString()

          lastPowerRef.current = power
          return ptRatio
        } catch (error) {
          if (power < decimal) {
            return calculateRatio(power + 1)
          }
          throw error
        }
      }

      return calculateRatio()
    },
  })
}
