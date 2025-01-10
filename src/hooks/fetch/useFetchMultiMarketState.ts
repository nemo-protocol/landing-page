import { useMutation } from "@tanstack/react-query"
import { useSuiClient } from "@mysten/dapp-kit"

const useFetchMultiMarketState = () => {
  const suiClient = useSuiClient()

  return useMutation({
    mutationFn: async (marketStateIds: string[]) => {
      const marketStates = await suiClient.multiGetObjects({
        ids: marketStateIds,
        options: { showContent: true }
      })

      return marketStates.map(item => {
        const fields = (
          item.data?.content as {
            fields?: {
              lp_supply: string
              total_sy: string
              market_cap: string
              total_pt: string
            }
          }
        )?.fields

        return {
          objectId: item.data?.objectId,
          lpSupply: fields?.lp_supply || "",
          totalSy: fields?.total_sy || "",
          totalPt: fields?.total_pt || "",
          marketCap: fields?.market_cap || "",
        }
      })
    }
  })
}

export default useFetchMultiMarketState
