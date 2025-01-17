import { MarketState } from "./types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

interface RawMarketState {
  total_sy: string
  total_pt: string
  lp_supply: string
  market_cap: string
}

const useMultiMarketState = (marketStateIds?: string[]) => {
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: ["multiMarketState", marketStateIds],
    queryFn: async () => {
      if (!marketStateIds?.length) return []

      const marketStates = await suiClient.multiGetObjects({
        ids: marketStateIds,
        options: { showContent: true },
      })

      // Create a map to store id -> MarketState mapping
      const stateMap = new Map(
        marketStates.map((item) => {
          const { fields } = item.data?.content as unknown as {
            fields: RawMarketState
          }
          const state: MarketState = {
            totalSy: fields?.total_sy,
            totalPt: fields?.total_pt,
            lpSupply: fields?.lp_supply,
            marketCap: fields?.market_cap,
          }
          return [item.data?.objectId, state]
        }),
      )

      // Return results in the same order as input marketStateIds
      return marketStateIds.map((id) => stateMap.get(id)!)
    },
    enabled: !!marketStateIds?.length,
  })
}

export default useMultiMarketState 