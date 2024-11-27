import { useSuiClientQuery } from "@mysten/dapp-kit"

const useMarketStateData = (marketStateId?: string) => {
  return useSuiClientQuery(
    "getObject",
    {
      id: marketStateId!,
      options: {
        showContent: true,
      },
    },
    {
      gcTime: 10000,
      enabled: !!marketStateId,
      select: (data) => {
        return (data.data?.content as { fields?: { lp_supply: string } })
          ?.fields?.lp_supply
      },
    },
  )
}

export default useMarketStateData
