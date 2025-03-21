import Decimal from "decimal.js"
import { debugLog } from "@/config"
import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "../../types"
import type { DebugInfo } from "../../types"
import { getPriceVoucher } from "@/lib/txHelper"
import { DEFAULT_Address } from "@/lib/constants"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import type { CoinConfig } from "@/queries/types/market"

type Result = {
  ptValue: string
  ptAmount: string
  syValue: string
  syAmount: string
  tradeFee: string
}

interface QueryPtOutBySyInParams {
  syAmount: string
  minPtAmount?: string
  innerCoinConfig?: CoinConfig
}

type DryRunResult<T extends boolean> = T extends true
  ? [Result, DebugInfo]
  : Result

export default function useQueryPtOutBySyIn<T extends boolean = false>(
  { outerCoinConfig, debug }: { outerCoinConfig?: CoinConfig; debug?: T } = {
    debug: false as T,
  },
) {
  const client = useSuiClient()
  const address = DEFAULT_Address

  return useMutation({
    mutationFn: async ({
      syAmount,
      innerCoinConfig,
      minPtAmount = "0",
    }: QueryPtOutBySyInParams): Promise<DryRunResult<T>> => {
      const coinConfig = outerCoinConfig || innerCoinConfig
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [priceVoucher, priceVoucherInfo] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::router::get_pt_out_for_exact_sy_in_with_price_voucher`,
        arguments: [
          { name: "net_sy_in", value: syAmount },
          { name: "min_pt_out", value: minPtAmount },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state_id", value: coinConfig.pyStateId },
          {
            name: "market_factory_config_id",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state_id", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(syAmount),
          tx.pure.u64(minPtAmount),
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
        "get_pt_out_for_exact_sy_in_with_price_voucher move call:",
        debugInfo,
      )

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get PT amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const ptAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      const ptValue = new Decimal(ptAmount.toString())
        .div(10 ** Number(coinConfig.decimal))
        .toFixed()

      const parsedSyAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[1][0]),
      )

      const syValue = new Decimal(parsedSyAmount.toString())
        .div(10 ** Number(coinConfig.decimal))
        .toFixed()

      const fee = bcs.U128.parse(
        new Uint8Array(result.results[1].returnValues[2][0]),
      )

      const tradeFee = new Decimal(fee)
        .div(2 ** 64)
        .div(10 ** Number(coinConfig.decimal))
        .toString()

      debugInfo.parsedOutput = `${ptValue} ${syValue} ${tradeFee}`

      return (
        debug
          ? [{ ptValue, ptAmount, syValue, syAmount, tradeFee }, debugInfo]
          : { ptValue, ptAmount, syValue, syAmount, tradeFee }
      ) as DryRunResult<T>
    },
  })
}
