import { MarketState } from "./types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import Decimal from "decimal.js"
import { safeDivide } from "@/lib/utils"
import { useTokenInfo } from "@/queries"

interface PoolRewarderInfo {
  total_reward: string
  end_time: string
  last_reward_time: string
  reward_token: {
    type: string
    fields: {
      name: string
    }
  }
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

const calculateDurationInDays = (startTime: string, endTime: string): number => {
  const start = dayjs(parseInt(startTime))
  const end = dayjs(parseInt(endTime))
  return end.diff(start, "day")
}

const calculateDailyEmission = (totalReward: string, durationInDays: number): string => {
  if (durationInDays === 0) return "0"
  return safeDivide(totalReward, durationInDays, "string")
}

const calculateAPY = (dailyYieldRate: string): string => {
  const rate = new Decimal(dailyYieldRate)
  return rate.plus(1).pow(365).minus(1).toString()
}

const calculateRewardMetrics = (rewarder: PoolRewarderInfo, tokenData: { price: string; logo: string }) => {
  const durationInDays = calculateDurationInDays(
    rewarder.last_reward_time,
    rewarder.end_time,
  )

  const tokenPrice = new Decimal(tokenData.price || "0")
  const dailyEmission = calculateDailyEmission(rewarder.total_reward, durationInDays)

  const rewardTvl = new Decimal(rewarder.total_reward).mul(tokenPrice).toString()
  const dailyValue = new Decimal(dailyEmission).mul(tokenPrice).toString()
  const dailyYieldRate = safeDivide(dailyValue, rewardTvl, "string")
  const apy = calculateAPY(dailyYieldRate)

  return {
    totalReward: rewarder.total_reward,
    durationInDays,
    dailyEmission,
    rewardTokenType: rewarder.reward_token.fields.name,
    tokenType: `0x${rewarder.reward_token.fields.name}`,
    tokenPrice: tokenPrice.toString(),
    logo: tokenData.logo,
    dailyValue,
    rewardTvl,
    dailyYieldRate,
    apy,
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
        
        const rewardMetrics = fields.reward_pool?.fields.rewarders.fields.contents.map(
          (entry) => {
            const rewarder = entry.fields.value.fields
            const tokenFullName = `0x${rewarder.reward_token.fields.name}`
            const tokenData = tokenInfo?.[tokenFullName] || {
              price: "0",
              logo: "",
            }
            return calculateRewardMetrics(rewarder, tokenData)
          }
        ) || []

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