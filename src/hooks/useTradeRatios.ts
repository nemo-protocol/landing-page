import { getSwapRatio } from "@/queries"
import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"

export function useTradeRatios(coinConfig?: CoinConfig) {

  return useQuery({
    queryKey: ["tradeRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      // const decimal = coinConfig!.decimal
      return await getSwapRatio(
        coinConfig!.marketStateId,
        "yt",
        "buy",
      )
    },
    enabled: !!coinConfig?.decimal && !!coinConfig?.marketStateId,
    refetchInterval: 20000,
  })
}
