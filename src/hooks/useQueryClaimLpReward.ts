import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { useQuery } from "@tanstack/react-query"
import { ContractError, LpPosition, MarketState, DebugInfo } from "./types"
import { formatDecimalValue, isValidAmount } from "@/lib/utils"
import { debugLog } from "@/config"
import { CoinData } from "./useCoinData"
import { mergeAllCoins } from "@/lib/txHelper"

interface ClaimLpRewardParams {
  lpBalance: string
  lpPositions?: LpPosition[]
  marketState?: MarketState
  rewardIndex: number
  suiCoins?: CoinData[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useQueryClaimLpReward<T extends boolean = false>(
  coinConfig?: CoinConfig,
  params?: ClaimLpRewardParams,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useQuery({
    queryKey: [
      "claimLpReward",
      coinConfig?.id,
      params?.lpBalance,
      params?.rewardIndex,
      address,
    ],
    enabled:
      !!address &&
      !!coinConfig &&
      isValidAmount(params?.lpBalance) &&
      !!params?.lpPositions?.length &&
      !!params?.marketState?.rewardMetrics?.length,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!params?.lpBalance) {
        throw new Error("No LP balance to claim")
      }
      if (!params?.lpPositions?.length) {
        throw new Error("No LP position found")
      }

      if (!params.suiCoins) {
        throw new Error("No SUI coins found")
      }

      const rewardMetric =
        params.marketState?.rewardMetrics?.[params.rewardIndex]
      if (!rewardMetric?.tokenType) {
        throw new Error("No reward token type found")
      }

      const tx = new Transaction()
      tx.setSender(address)

      mergeAllCoins(tx, address, params.suiCoins, coinConfig.coinType)

      const moveCallInfo = {
        target: `${coinConfig?.nemoContractId}::market::claim_reward`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "market_position", value: params.lpPositions[0].id.id },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType, rewardMetric.tokenType],
      }

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
      }

      const [coin] = tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.object(coinConfig.version),
          tx.object(coinConfig.marketStateId),
          tx.object(params.lpPositions[0].id.id),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType, rewardMetric.tokenType],
      })

      tx.moveCall({
        target: `0x2::coin::value`,
        arguments: [coin],
        typeArguments: [rewardMetric.tokenType],
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      debugInfo.rawResult = result

      if (result?.error) {
        const message = result.error
        if (debugInfo.rawResult) {
          debugInfo.rawResult.error = message
        }
        debugLog("claim_reward error:", debugInfo)
        throw new ContractError(message, debugInfo)
      }

      if (!result?.results?.[result.results.length - 1]?.returnValues?.[0]) {
        const message = "Failed to get reward amount"
        if (debugInfo.rawResult) {
          debugInfo.rawResult.error = message
        }
        debugLog("claim_reward error:", debugInfo)
        throw new ContractError(message, debugInfo)
      }

      const [[balanceBytes]] =
        result.results[result.results.length - 1].returnValues
      const rewardAmount = bcs.U64.parse(new Uint8Array(balanceBytes))

      debugInfo.parsedOutput = rewardAmount

      if (!debug) {
        debugLog("claim_reward debugInfo:", debugInfo)
      }

      const decimal = Number(rewardMetric.decimal)
      const rewardValue = formatDecimalValue(
        new Decimal(rewardAmount).div(new Decimal(10).pow(decimal)),
        decimal,
      )

      return (debug ? [rewardValue, debugInfo] : rewardValue) as DryRunResult<T>
    },
  })
}
