import { MarketState } from "./types"
import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { usePoolMetrics, PoolMetricsResult } from "./actions/usePoolMetrics"

function validateCoinInfo(coinInfo: CoinConfig) {
  const requiredFields = [
    "decimal",
    "maturity",
    "marketStateId",
    "underlyingApy",
    "underlyingPrice",
    "coinPrice",
    "swapFeeForLpHolder",
  ] as const

  for (const field of requiredFields) {
    if (coinInfo[field] === undefined || coinInfo[field] === null) {
      console.error(
        `Missing required field: ${field}, coinName: ${coinInfo.coinName}, maturity: ${new Date(
          Number(coinInfo.maturity),
        ).toLocaleString()}`,
      )
      throw new Error(
        `Missing required field: ${field}, coinName: ${coinInfo.coinName}, maturity: ${new Date(
          Number(coinInfo.maturity),
        ).toLocaleString()}`,
      )
    }
  }
}

export function useCalculatePtYt(
  coinInfo?: CoinConfig,
  marketState?: MarketState,
) {
  const mutation = usePoolMetrics()

  const query = useQuery<PoolMetricsResult>({
    queryKey: ["useCalculatePtYt", coinInfo?.marketStateId],
    queryFn: async () => {
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }
      if (!marketState) {
        throw new Error("Failed get market state")
      }

      validateCoinInfo(coinInfo)

      return mutation.mutateAsync({
        coinInfo,
        marketState,
      })
    },
    enabled: !!coinInfo?.decimal && !!marketState,
  })

  const refresh = async () => {
    if (coinInfo && marketState) {
      return await mutation.refresh({
        coinInfo,
        marketState,
      })
    }
  }

  return {
    ...query,
    refresh,
  }
}
