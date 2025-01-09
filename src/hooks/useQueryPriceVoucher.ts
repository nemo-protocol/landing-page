import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { ContractError } from "./types"
import type { BaseCoinInfo, CoinConfig } from "@/queries/types/market"
import type { DebugInfo } from "./types"
import { bcs } from "@mysten/sui/bcs"
import { getPriceVoucher } from "@/lib/txHelper"

interface MoveCallInfo {
  target: string
  arguments: { name: string; value: string }[]
  typeArguments: string[]
}

export default function useQueryPriceVoucher(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async (): Promise<string | [string, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [, moveCallInfo] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: moveCallInfo as MoveCallInfo,
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[0]?.returnValues?.[0]) {
        const message = "Failed to get price voucher"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputVoucher = bcs.U128.parse(
        new Uint8Array(result.results[0].returnValues[0][0]),
      ).toString()
      debugInfo.parsedOutput = outputVoucher

      return debug ? [outputVoucher, debugInfo] : outputVoucher
    },
  })
}

export function useQueryPriceVoucherWithCoinInfo(
  coinConfig?: BaseCoinInfo,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const address =
    "0x0000000000000000000000000000000000000000000000000000000000000001"

  return useMutation({
    mutationFn: async (): Promise<[string, string] | [string, string, DebugInfo]> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [priceVoucher, moveCallInfo] = getPriceVoucher(tx, coinConfig)
      tx.moveCall({
        target: `${coinConfig.nemoContractId}::router::get_pt_out_for_exact_sy_in_with_price_voucher`,
        arguments: [
          tx.pure.u64(1000),
          tx.pure.u64("0"),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      })
      const debugInfo: DebugInfo = {
        moveCall: moveCallInfo as MoveCallInfo,
      }

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[0]?.returnValues?.[0]) {
        const message = "Failed to get price voucher"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputVoucher = bcs.U128.parse(
        new Uint8Array(result.results[0].returnValues[0][0]),
      ).toString()

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get pt out"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }
      const ptOut = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      ).toString()

      debugInfo.parsedOutput = outputVoucher

      return debug ? [outputVoucher, ptOut, debugInfo] : [outputVoucher, ptOut]
    },
  })
}
