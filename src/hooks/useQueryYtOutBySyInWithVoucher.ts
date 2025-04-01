import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "./types"
import type { DebugInfo } from "./types"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { formatDecimalValue } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"

interface YtOutBySyInResult {
  ytValue: string
  feeValue: string
  ytAmount: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [YtOutBySyInResult, DebugInfo]
  : YtOutBySyInResult

export default function useQueryYtOutBySyInWithVoucher<
  T extends boolean = false,
>(coinConfig?: CoinConfig, debug: T = false as T) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async (syAmount: string): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      const [priceVoucher, priceVoucherInfo] = getPriceVoucher(tx, coinConfig)
      tx.setSender(address)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::router::get_yt_out_for_exact_sy_in_with_price_voucher`,
        arguments: [
          { name: "net_sy_in", value: syAmount },
          { name: "min_yt_out", value: "0" },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state_id", value: coinConfig.pyStateId },
          { name: "market_state_id", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(syAmount),
          tx.pure.u64("0"),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: moveCallInfo.typeArguments,
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherInfo, moveCallInfo],
        rawResult: result,
      }

      debugLog(
        "get_yt_out_for_exact_sy_in_with_price_voucher move call:",
        debugInfo,
      )

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get YT amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const decimal = Number(coinConfig.decimal)

      const ytAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      const ytValue = formatDecimalValue(
        new Decimal(ytAmount).div(10 ** decimal),
        decimal,
      )

      const feeAmount = bcs.U128.parse(
        new Uint8Array(result.results[1].returnValues[1][0]),
      )

      const feeValue = formatDecimalValue(
        new Decimal(feeAmount).div(2 ** 64).div(10 ** decimal),
        decimal,
      )

      const resultObj = { ytValue, feeValue, ytAmount }
      debugInfo.parsedOutput = `${ytValue},${feeValue}`

      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
