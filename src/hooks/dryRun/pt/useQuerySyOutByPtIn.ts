import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { ContractError } from "../../types"
import type { BaseCoinInfo } from "@/queries/types/market"
import type { DebugInfo } from "../../types"
import { bcs } from "@mysten/sui/bcs"
import { getPriceVoucher } from "@/lib/txHelper"
import { DEFAULT_Address } from "@/lib/constants"
import Decimal from "decimal.js"
import { debugLog } from "@/config"

interface SyOutByPtInResult {
  syValue: string
  syAmount: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [SyOutByPtInResult, DebugInfo]
  : SyOutByPtInResult

export default function useQuerySyOutDryRun<T extends boolean = false>(
  { outerCoinInfo, debug }: { outerCoinInfo?: BaseCoinInfo; debug: T } = {
    debug: false as T,
  },
) {
  const client = useSuiClient()
  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async ({
      ptIn,
      innerCoinInfo,
    }: {
      ptIn: string
      innerCoinInfo?: BaseCoinInfo
    }): Promise<DryRunResult<T>> => {
      const coinInfo = outerCoinInfo || innerCoinInfo
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const moveCallInfo = {
        target: `${coinInfo.nemoContractId}::router::get_sy_amount_out_for_exact_pt_in_with_price_voucher`,
        arguments: [
          { name: "exact_pt_in", value: ptIn },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state", value: coinInfo.pyStateId },
          {
            name: "market_factory_config",
            value: coinInfo.marketFactoryConfigId,
          },
          { name: "market", value: coinInfo.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinInfo.syCoinType],
      }

      const debugInfo: DebugInfo = {
        moveCall: [moveCallInfo],
      }

      debugLog(
        "get_sy_amount_out_for_exact_pt_in_with_price_voucher move call:",
        debugInfo,
      )

      const [priceVoucher] = getPriceVoucher(tx, coinInfo)

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(ptIn),
          priceVoucher,
          tx.object(coinInfo.pyStateId),
          tx.object(coinInfo.marketFactoryConfigId),
          tx.object(coinInfo.marketStateId),
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

      console.log("result", result)

      // 记录原始结果
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "获取 sy 数量失败"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }
      
      const syAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      ).toString()

      const syValue = new Decimal(syAmount)
        .div(10 ** Number(coinInfo.decimal))
        .toFixed()

      debugInfo.parsedOutput = syAmount

      const resultObj = { syValue, syAmount }
      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
