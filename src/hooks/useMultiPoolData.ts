import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import Decimal from "decimal.js"
import { safeDivide } from "@/lib/utils"

const SPRING_SUI_TYPE =
  "83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI"

const priceMap: { [key: string]: number } = {
  [SPRING_SUI_TYPE]: 3.1589,
}

export interface RewardMetrics {
  totalReward: string // Total reward tokens (T)
  durationInDays: number // Duration in days (D)
  dailyEmission: string // Daily emission = T/D
  rewardTokenType: string // Reward token type
  tokenPrice: number // Current token price (P)
  dailyValue: string // Daily value = daily emission * P
  rewardTvl: string // Total Value Locked in USD
  dailyYieldRate: string // Daily yield rate = daily value / TVL
  apy: string // Annual Percentage Yield
}

interface RawPoolData {
  rewarders: {
    type: string
    fields: {
      contents: Array<{
        type: string
        fields: {
          key: string
          value: {
            type: string
            fields: {
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
          }
        }
      }>
    }
  }
  total_stake_shares: string // For TVL calculation
  market_id: string // Market ID
}

type PoolDataMap = { [key: string]: RewardMetrics[] }

const calculateDurationInDays = (
  startTime: string,
  endTime: string,
): number => {
  const start = dayjs(parseInt(startTime))
  const end = dayjs(parseInt(endTime))
  return end.diff(start, "day")
}

const calculateDailyEmission = (
  totalReward: string,
  durationInDays: number,
): string => {
  if (durationInDays === 0) return "0"
  return safeDivide(totalReward, durationInDays, "string")
}

const calculateAPY = (dailyYieldRate: string): string => {
  const rate = new Decimal(dailyYieldRate)
  return rate.plus(1).pow(365).minus(1).toString()
}

const useMultiPoolData = (poolIds?: string[]) => {
  const suiClient = useSuiClient()

  return useQuery<PoolDataMap>({
    queryKey: ["multiPoolData", poolIds],
    queryFn: async (): Promise<PoolDataMap> => {
      if (!poolIds?.length) return {}

      const poolDataList = await suiClient.multiGetObjects({
        ids: poolIds,
        options: { showContent: true },
      })

      return poolIds.reduce((acc, _, index) => {
        const item = poolDataList[index]
        const { fields } = item.data?.content as unknown as {
          fields: RawPoolData
        }

        const rewardMetrics = fields.rewarders.fields.contents.map((entry) => {
          const rewarder = entry.fields.value.fields
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
        })

        acc[fields.market_id] = rewardMetrics
        return acc
      }, {} as PoolDataMap)
    },
    enabled: !!poolIds?.length,
  })
}

export default useMultiPoolData
