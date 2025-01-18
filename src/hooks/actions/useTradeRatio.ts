import { useQuery } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"

export default function useTradeRatio(coinConfig?: CoinConfig) {
  return useQuery({
    queryKey: ["tradeRatio", coinConfig?.marketStateId],
    queryFn: async () => {
      // const decimal = coinConfig!.decimal
      return await "1"
    },
    enabled: !!coinConfig?.decimal && !!coinConfig?.marketStateId,
    refetchInterval: 20000,
  })
}
