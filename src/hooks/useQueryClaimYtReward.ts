import Decimal from "decimal.js"
import type { PyPosition } from "./types"
import { isValidAmount } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { redeemSyCoin, getPriceVoucher, burnSCoin } from "@/lib/txHelper"

interface ClaimYtRewardParams {
  ytBalance: string
  pyPositions?: PyPosition[]
  tokenType?: number
}

export default function useQueryClaimYtReward(
  coinConfig?: CoinConfig,
  params?: ClaimYtRewardParams,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useQuery({
    queryKey: ["claimYtReward", coinConfig?.id, params?.ytBalance, address],
    enabled:
      !!address &&
      !!coinConfig &&
      isValidAmount(params?.ytBalance) &&
      params?.tokenType === 1, // 1 represents YT token type
    queryFn: async () => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!params?.ytBalance) {
        throw new Error("No YT balance to claim")
      }

      const tx = new Transaction()
      tx.setSender(address)

      let pyPosition
      let created = false
      if (!params.pyPositions?.length) {
        created = true
        const moveCall = {
          target: `${coinConfig?.nemoContractId}::py::init_py_position`,
          arguments: [coinConfig?.version, coinConfig?.pyStateId],
          typeArguments: [coinConfig?.syCoinType],
        }

        pyPosition = tx.moveCall({
          ...moveCall,
          arguments: moveCall.arguments.map((arg) => tx.object(arg)),
        })[0]
      } else {
        pyPosition = tx.object(params.pyPositions[0].id)
      }

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const [syCoin] = tx.moveCall({
        target: `${coinConfig?.nemoContractId}::yield_factory::redeem_due_interest`,
        arguments: [
          tx.object(coinConfig.version),
          pyPosition,
          tx.object(coinConfig?.pyStateId),
          priceVoucher,
          tx.object(coinConfig?.yieldFactoryConfigId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig?.syCoinType],
      })

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
      tx.transferObjects([underlyingCoin], address)

      if (created) {
        tx.transferObjects([pyPosition], address)
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      console.log("result", result)

      if (result?.error) {
        throw new Error(result.error)
      }

      if (
        !result?.events?.[result.events.length - 1]?.parsedJson.withdraw_amount
      ) {
        throw new Error("Failed to get yt reward data")
      }

      const decimal = Number(coinConfig.decimal)

      return new Decimal(
        result.events[result.events.length - 1].parsedJson.withdraw_amount,
      )
        .div(new Decimal(10).pow(decimal))
        .toFixed(decimal)
    },
  })
}
