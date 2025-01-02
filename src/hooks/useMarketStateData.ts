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
      queryKey: ["marketStateData", marketStateId],
      enabled: !!marketStateId,
      select: (data) => {
        const fields = (
          data.data?.content as {
            fields?: { lp_supply: string; total_sy: string; market_cap: string; total_pt: string }
          }
        )?.fields

        return {
          marketCap: fields?.market_cap || "",
          totalSy: fields?.total_sy || "",
          lpSupply: fields?.lp_supply || "",
          totalPt: fields?.total_pt || ""
        }
      },
    },
  )
}

export default useMarketStateData
