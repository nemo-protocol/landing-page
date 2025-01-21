import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import { getPriceVoucher } from "@/lib/txHelper"
import type { DebugInfo } from "./types"
import { ContractError } from "./types"

export default function useQueryYtOutBySyInWithVoucher(
  coinConfig?: CoinConfig,
  debug: boolean = false,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async (
      syValue: string,
    ): Promise<[string] | [string, DebugInfo]> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const debugInfo: DebugInfo = {
        moveCall: {
          target: `${coinConfig.nemoContractId}::router::get_yt_out_for_exact_sy_in_with_price_voucher`,
          arguments: [
            { name: "net_sy_in", value: syValue },
            { name: "min_yt_out", value: "0" },
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
        },
      }

      console.log("debugInfo", debugInfo)

      const tx = new Transaction()
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)
      tx.setSender(address)

      tx.moveCall({
        target: debugInfo.moveCall.target,
        arguments: [
          tx.pure.u64(syValue),
          tx.pure.u64("0"),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: debugInfo.moveCall.typeArguments,
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      console.log("result", result)

      // Record raw result
      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      if (result?.error) {
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get YT amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      debugInfo.parsedOutput = outputAmount.toString()

      const returnValue = outputAmount.toString()

      return debug ? [returnValue, debugInfo] : [returnValue]
    },
  })
}
