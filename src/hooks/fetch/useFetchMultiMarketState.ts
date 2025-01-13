import { MarketState } from "../types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"

interface RawMarketState {
  total_sy: string
  total_pt: string
  lp_supply: string
  market_cap: string
}

const useFetchMultiMarketState = () => {
  const suiClient = useSuiClient()

  return useMutation<MarketState[], Error, string[]>({
    mutationFn: async (marketStateIds: string[]) => {
      const marketStates = await suiClient.multiGetObjects({
        ids: marketStateIds,
        options: { showContent: true },
      })

      return marketStates.map((item) => {
        const { fields } = item.data?.content as unknown as {
          fields: RawMarketState
        }

        return {
          totalSy: fields?.total_sy,
          totalPt: fields?.total_pt,
          lpSupply: fields?.lp_supply,
          marketCap: fields?.market_cap,
        }
      })
    },
  })
}

export default useFetchMultiMarketState
