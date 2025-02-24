import { useQuery } from "@tanstack/react-query"
import useGetConversionRateDryRun from "@/hooks/dryRun/useGetConversionRateDryRun"
import type { CoinConfig } from "./types/market"

export function useConversionRate(coinConfig?: CoinConfig) {
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  return useQuery({
    queryKey: ["conversionRate", coinConfig?.marketStateId],
    queryFn: async () => {
      if (!coinConfig) return undefined
      return getConversionRate(coinConfig)
    },
    enabled: !!coinConfig,
  })
} 