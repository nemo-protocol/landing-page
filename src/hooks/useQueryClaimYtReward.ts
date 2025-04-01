import Decimal from "decimal.js"
import { bcs } from "@mysten/sui/bcs"
import { formatDecimalValue, isValidAmount } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { redeemSyCoin } from "@/lib/txHelper"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { ContractError, type DebugInfo, type PyPosition } from "./types"
import { getPriceVoucher } from "@/lib/txHelper/price"

interface ClaimYtRewardParams {
  ytBalance: string
  tokenType?: number
  pyPositions?: PyPosition[]
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
    refetchInterval: 60 * 1000, // 每分钟刷新一次
    refetchIntervalInBackground: true, // 即使页面在后台也继续刷新
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

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const redeemDueInterestMoveCall = {
        target: `${coinConfig?.nemoContractId}::yield_factory::redeem_due_interest`,
        arguments: [
          {
            name: "version",
            value: coinConfig.version,
          },
          {
            name: "py_position",
            value: "pyPosition",
          },
          {
            name: "pyStateId",
            value: coinConfig?.pyStateId,
          },
          {
            name: "price_voucher",
            value: "priceVoucher",
          },
          {
            name: "yield_factory_config",
            value: coinConfig?.yieldFactoryConfigId,
          },
          {
            name: "clock",
            value: "0x6",
          },
        ],
        typeArguments: [coinConfig?.syCoinType],
      }
      const [syCoin] = tx.moveCall({
        target: redeemDueInterestMoveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          pyPosition,
          tx.object(coinConfig?.pyStateId),
          priceVoucher,
          tx.object(coinConfig?.yieldFactoryConfigId),
          tx.object("0x6"),
        ],
        typeArguments: redeemDueInterestMoveCall.typeArguments,
      })

      const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

      tx.moveCall({
        target: `0x2::coin::value`,
        arguments: [yieldToken],
        typeArguments: [coinConfig.coinType],
      })

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

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, redeemDueInterestMoveCall],
        rawResult: {
          error: result?.error,
          results: result?.results,
        },
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const decimal = Number(coinConfig.decimal)

      const syAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      return formatDecimalValue(
        new Decimal(syAmount).div(10 ** decimal).toString(),
        decimal,
      )
    },
  })
}
