// import { debugLog } from "@/config"
import { useSuiClient } from "@mysten/dapp-kit"
import { useTokenInfo } from "@/queries"
import { getTokenDecimal } from "@/lib/utils"
import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"

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

  return {
    tokenType,
    tokenLogo,
    dailyEmission,
    tokenPrice,
  }
}

const useMarketStateData = (marketStateId?: string) => {
  const suiClient = useSuiClient()
  const { mutateAsync: fetchTokenInfo } = useTokenInfo()

  return useQuery({
    queryKey: ["marketStateData", marketStateId],
    queryFn: async () => {
      if (!marketStateId) {
        return {
          marketCap: "",
          totalSy: "",
          lpSupply: "",
          totalPt: "",
          rewardMetrics: [],
        }
      }

      const [data, tokenInfo] = await Promise.all([
        suiClient.getObject({
          id: marketStateId,
          options: {
            showContent: true,
          },
        }),
        fetchTokenInfo(),
      ])

      const fields = (data.data?.content as { fields?: RawMarketState })?.fields

      if (!fields) {
        return {
          marketCap: "",
          totalSy: "",
          lpSupply: "",
          totalPt: "",
          rewardMetrics: [],
        }
      }

      // Group rewarders by tokenType and sum their emission_per_second
      const currentTime = Date.now()
      const groupedRewarders = (
        fields.reward_pool?.fields.rewarders.fields.contents || []
      )
        .filter(
          (entry) => Number(entry.fields.value.fields.end_time) > currentTime,
        )
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

      return {
        marketCap: fields.market_cap || "",
        totalSy: fields.total_sy || "",
        lpSupply: fields.lp_supply || "",
        totalPt: fields.total_pt || "",
        rewardMetrics,
      }
    },
    enabled: !!marketStateId,
  })
}

export default useMarketStateData
