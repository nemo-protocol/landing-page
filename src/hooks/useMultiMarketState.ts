import { MarketState } from "./types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"

interface RawMarketState {
  total_sy: string
  total_pt: string
  lp_supply: string
  market_cap: string
}

type MarketStateMap = { [key: string]: MarketState }

const useMultiMarketState = (marketStateIds?: string[]) => {
  const suiClient = useSuiClient()

  return useQuery<MarketStateMap>({
    queryKey: ["multiMarketState", marketStateIds],
    queryFn: async (): Promise<MarketStateMap> => {
      if (!marketStateIds?.length) return {}

      const marketStates = await suiClient.multiGetObjects({
        ids: marketStateIds,
        options: { showContent: true },
      })

      return marketStateIds.reduce((acc, marketStateId, index) => {
        const item = marketStates[index]
        const { fields } = item.data?.content as unknown as {
          fields: RawMarketState
        }
        
        const state: MarketState = {
          totalSy: fields?.total_sy,
          totalPt: fields?.total_pt,
          lpSupply: fields?.lp_supply,
          marketCap: fields?.market_cap,
        }

        acc[marketStateId] = state
        return acc
      }, {} as MarketStateMap)
    },
    enabled: !!marketStateIds?.length,
  })
}

export default useMultiMarketState 