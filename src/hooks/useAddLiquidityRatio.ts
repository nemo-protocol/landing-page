import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { getLPRatio } from "@/queries"
import useQueryLpOutFromMintLp from "./useQueryLpOutFromMintLp"
import { useRef } from "react"
import { splitSyAmount } from "@/lib/utils"
import useMarketStateData from "@/hooks/useMarketStateData.ts"

export function useAddLiquidityRatio(coinConfig?: CoinConfig) {
  const lastPowerRef = useRef(0)
  const { address } = useWallet()
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
 const {data: marketState } =   useMarketStateData(coinConfig?.marketStateId)

  return useQuery({
    queryKey: ["addLiquidityRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!marketState) {
        throw new Error("not found market")
      }

      const decimal = coinConfig.decimal
      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<{ ratio: string; conversionRate: string }> => {
        if (power >= decimal) return { ratio: "", conversionRate: "" }

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const baseAmount = new Decimal(10).pow(safeDecimal).toString()
          const { ptValue, syValue } = splitSyAmount(baseAmount, marketState.lpSupply, marketState.totalSy, marketState.totalPt)
          const [lpAmount] = await queryLpOut({
            ptValue,
            syValue,
          })
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
