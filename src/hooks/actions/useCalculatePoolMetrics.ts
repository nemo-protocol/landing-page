import { MarketState } from "../types"
import { useMutation } from "@tanstack/react-query"
import { BaseCoinInfo, CoinConfig } from "@/queries/types/market"
import { usePoolMetrics } from "../usePoolMetrics"

interface CalculatePoolMetricsParams {
  coinInfo: BaseCoinInfo
  marketState: MarketState
}

export default function useCalculatePoolMetrics() {
  const mutation = usePoolMetrics()

  const calculateMetrics = async ({
    coinInfo,
    marketState,
  }: CalculatePoolMetricsParams) => {
    if (!coinInfo) {
      throw new Error("Please select a pool")
    }

    if (!marketState) {
      throw new Error("Please provide market state")
    }

    return mutation.mutateAsync({
      coinInfo: coinInfo as CoinConfig,
      marketState,
    })
  }

  return useMutation({
    mutationFn: calculateMetrics,
  })
}
