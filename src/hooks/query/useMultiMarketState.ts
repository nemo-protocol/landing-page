import { MarketState } from "../types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { getTokenDecimal } from "@/lib/utils"
import { useTokenInfo } from "@/queries"

interface PoolRewarderInfo {
  total_reward: string
  end_time: string
  last_reward_time: string
  reward_harvested: string
  reward_debt: string
  reward_token: {
    type: string
    fields: {
      name: string
    }
  }
  acc_per_share: string
  active: boolean
  emission_per_second: string
  id: {
    id: string
  }
  owner: string
  start_time: string
}

interface RawMarketState {
  total_sy: string
  total_pt: string
  lp_supply: string
  market_cap: string
  reward_pool?: {
    fields: {
      rewarders: {
        fields: {
          contents: Array<{
            fields: {
              value: {
                fields: PoolRewarderInfo
              }
            }
          }>
        }
      }
    }
  }
}

const calculateRewardMetrics = (
  emissionPerSecond: string,
  tokenType: string,
  tokenPrice: string,
  tokenLogo: string,
) => {
  const decimal = getTokenDecimal(tokenType)

  // Calculate daily emission from emission_per_second
  const dailyEmission = new Decimal(emissionPerSecond)
    .mul(60 * 60 * 24)
    .div(new Decimal(10).pow(decimal))
    .toString()

  // Calculate daily value
  const dailyValue = new Decimal(dailyEmission).mul(tokenPrice).toString()

  return {
    tokenType,
    tokenLogo,
    dailyEmission,
    dailyValue,
    apy: "",
    tokenPrice,
  }
}

type MarketStateMap = { [key: string]: MarketState }

const useMultiMarketState = (marketStateIds?: string[]) => {
  const suiClient = useSuiClient()
  const { mutateAsync: fetchTokenInfo } = useTokenInfo()

  return useQuery<MarketStateMap>({
    queryKey: ["multiMarketState", marketStateIds],
    queryFn: async (): Promise<MarketStateMap> => {
      if (!marketStateIds?.length) return {}

      const [marketStates, tokenInfo] = await Promise.all([
        suiClient.multiGetObjects({
          ids: marketStateIds,
          options: { showContent: true },
        }),
        fetchTokenInfo(),
      ])

      return marketStateIds.reduce((acc, marketStateId, index) => {
        const item = marketStates[index]
        const { fields } = item.data?.content as unknown as {
          fields: RawMarketState
        }

        // Group rewarders by tokenType and sum their emission_per_second
        const currentTime = Date.now()
        const groupedRewarders = (
          fields.reward_pool?.fields.rewarders.fields.contents || []
        )
        .filter(entry => Number(entry.fields.value.fields.end_time) > currentTime)
        .reduce(
          (acc, entry) => {
            const rewarder = entry.fields.value.fields
            const tokenType = rewarder.reward_token.fields.name

            if (!acc[tokenType]) {
              acc[tokenType] = {
                emissionPerSecond: "0",
                tokenType,
              }
            }

            acc[tokenType].emissionPerSecond = new Decimal(
              acc[tokenType].emissionPerSecond,
            )
              .plus(rewarder.emission_per_second)
              .toString()

            return acc
          },
          {} as {
            [key: string]: { emissionPerSecond: string; tokenType: string }
          },
        )

        // Calculate metrics for each grouped rewarder
        const rewardMetrics = Object.values(groupedRewarders).map(
          (groupedRewarder) => {
            const tokenFullName = `0x${groupedRewarder.tokenType}`
            const tokenData = tokenInfo?.[tokenFullName] || {
              price: "0",
              logo: "",
            }

            return calculateRewardMetrics(
              groupedRewarder.emissionPerSecond,
              groupedRewarder.tokenType,
              tokenData.price,
              tokenData.logo,
            )
          },
        )

        const state: MarketState = {
          totalSy: fields?.total_sy,
          totalPt: fields?.total_pt,
          lpSupply: fields?.lp_supply,
          marketCap: fields?.market_cap,
          rewardMetrics,
        }

        acc[marketStateId] = state
        return acc
      }, {} as MarketStateMap)
    },
    enabled: !!marketStateIds?.length,
  })
}

export default useMultiMarketState
