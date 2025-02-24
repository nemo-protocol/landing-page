import { Time } from "@/lib/constants"
import { useQuery } from "@tanstack/react-query"
import type { CoinConfig } from "@/queries/types/market"
import useGetConversionRateDryRun from "@/hooks/dryRun/useGetConversionRateDryRun"

export default function useQueryConversionRate(coinConfig?: CoinConfig) {
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  return useQuery({
    queryKey: ["conversionRate", coinConfig?.marketStateId],
    queryFn: async () => {
      if (!coinConfig) return undefined
      return getConversionRate(coinConfig)
    },
    enabled: !!coinConfig,
    refetchInterval: Time.CONVERSION_RATE_REFRESH_INTERVAL,
  })
}
