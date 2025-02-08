import { useSuiClientQuery } from "@mysten/dapp-kit"

// Pool 类型定义
export interface Pool {
  id: string
  market_id: string
  expiry: string
  vault: {
    id: string
    balances: Record<string, string>
  }
  total_stake_shares: string
  rewarders: Array<{
    key: string
    value: {
      reward_token: string
      rewards_per_second: string
      last_reward_timestamp: string
      accrued_rewards_per_share: string
    }
  }>
}

const PACKAGE_ID =
  "0x7bfaae484d7b42982ade438d65a455472320a9070ef5275186622d0d3d526fad"

const usePoolObject = () => {
  return useSuiClientQuery(
    "getObject",
    {
      id: PACKAGE_ID,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
        showDisplay: true,
        showPreviousTransaction: true,
        showBcs: true,
        showStorageRebate: true,
      },
    },
    {
      select: (response) => {
        console.log("response", response)

        const poolsData: Record<string, Pool> = {}

        if (!response?.data?.content) return poolsData

        const content = response.data.content
        if (content && typeof content === "object") {
          Object.entries(content).forEach(([id, data]) => {
            poolsData[id] = data as Pool
          })
        }

        return poolsData
      },
    },
  )
}

export default usePoolObject
