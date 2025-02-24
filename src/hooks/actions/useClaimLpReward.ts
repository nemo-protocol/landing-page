import { CoinConfig } from "@/queries/types/market"
import { debugLog } from "@/config"
import { useMutation } from "@tanstack/react-query"
import type { DebugInfo } from "../types"
import { Transaction } from "@mysten/sui/transactions"
import { LpPosition, RewardMetrics } from "@/hooks/types"
import { useWallet } from "@nemoprotocol/wallet-kit"

interface ClaimLpRewardParams {
  tx: Transaction
  coinConfig: CoinConfig
  lpPositions: LpPosition[]
  rewardMetric: RewardMetrics
}

type DryRunResult<T extends boolean> = T extends true ? DebugInfo : void

export default function useClaimLpReward<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const { address } = useWallet()
  return useMutation({
    mutationFn: async ({
      tx,
      lpPositions,
      rewardMetric,
    }: ClaimLpRewardParams): Promise<DryRunResult<T>> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!address) {
        throw new Error("Please connect your wallet")
      }
      const debugInfo: DebugInfo = {
        moveCall: [],
      }

      if (!rewardMetric?.tokenType) {
        throw new Error("No reward token type found")
      }

      const claimRewardMoveCall = {
        target: `${coinConfig.nemoContractId}::market::claim_reward`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "lp_position", value: lpPositions[0].id.id },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType, rewardMetric.tokenType],
      }

      const [coin] = tx.moveCall({
        target: claimRewardMoveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.object(coinConfig.marketStateId),
          tx.object(lpPositions[0].id.id),
          tx.object("0x6"),
        ],
        typeArguments: claimRewardMoveCall.typeArguments,
      })

      tx.transferObjects([coin], address)

      debugInfo.moveCall = [claimRewardMoveCall]

      if (!debug) {
        debugLog("claim_lp_reward debugInfo:", debugInfo)
      }

      return (debug ? debugInfo : undefined) as DryRunResult<T>
    },
  })
}
