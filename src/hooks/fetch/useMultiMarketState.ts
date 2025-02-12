import { MarketState } from "../types"
import { useSuiClient } from "@mysten/dapp-kit"
import { useMutation } from "@tanstack/react-query"
import dayjs from "dayjs"
import Decimal from "decimal.js"
import { safeDivide } from "@/lib/utils"

const SPRING_SUI_TYPE = "83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI"
const SSUI_TYPE = "0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"

const priceMap: { [key: string]: number } = {
  [SPRING_SUI_TYPE]: 3.1589,
  [SSUI_TYPE]: 3.1589,
}

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

const calculateRewardMetrics = (rewarder: PoolRewarderInfo) => {
  const durationInDays = calculateDurationInDays(
    rewarder.last_reward_time,
    rewarder.end_time,
  )
  const tokenPrice = priceMap[rewarder.reward_token.fields.name] || 0
  const dailyEmission = calculateDailyEmission(
    rewarder.total_reward,
    durationInDays,
  )

  // Calculate TVL (total_reward * price)
  const rewardTvl = new Decimal(rewarder.total_reward)
    .mul(tokenPrice)
    .toString()

  // Calculate daily value (daily emission * token price)
  const dailyValue = new Decimal(dailyEmission)
    .mul(tokenPrice)
    .toString()

  // Calculate daily yield rate (daily value / TVL)
  const dailyYieldRate = safeDivide(dailyValue, rewardTvl, "string")

  // Calculate APY
  const apy = calculateAPY(dailyYieldRate)

  return {
    totalReward: rewarder.total_reward,
    durationInDays,
    dailyEmission,
    rewardTokenType: rewarder.reward_token.fields.name,
    tokenPrice,
    dailyValue,
    rewardTvl,
    dailyYieldRate,
    apy,
  }
}

const useMultiMarketState = () => {
  const suiClient = useSuiClient()

  return useMutation<{ [key: string]: MarketState }, Error, string[]>({
    mutationFn: async (marketStateIds: string[]) => {
      const marketStates = await suiClient.multiGetObjects({
        ids: marketStateIds,
        options: { showContent: true },
      })

      console.log("marketStates", marketStates)

      return marketStateIds.reduce((acc, marketStateId, index) => {
        const item = marketStates[index]
        const { fields } = item.data?.content as unknown as {
          fields: RawMarketState
        }
        
        const rewardMetrics = fields.reward_pool?.fields.rewarders.fields.contents.map(
          entry => calculateRewardMetrics(entry.fields.value.fields)
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
      }, {} as { [key: string]: MarketState })
    },
  })
}

export default useMultiMarketState
