import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import { getPriceVoucher } from "@/lib/txHelper"
import { debugLog } from "@/config"

interface GetApproxYtOutParams {
  netSyIn: string
  minYtOut: string
}

interface YtOutResult {
  approxYtOut: string
  netSyTokenization: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [YtOutResult, DebugInfo] // Return result object with debug info when debug is true
  : YtOutResult // Return just the result object

export default function useGetApproxYtOutDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      netSyIn,
      minYtOut,
    }: GetApproxYtOutParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig,
      )

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::offchain::get_approx_yt_out_for_net_sy_in_internal`,
        arguments: [
          { name: "net_sy_in", value: netSyIn },
          { name: "min_yt_out", value: minYtOut },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "market_state", value: coinConfig.marketStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      debugLog("get_approx_yt_out move call:", moveCallInfo)

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(netSyIn),
          tx.pure.u64(minYtOut),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      })

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, moveCallInfo],
        rawResult: result,
      }

      if (!result?.results?.[result.results.length - 1]?.returnValues?.[0]) {
        const message = "Failed to get yt output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      // Parse both YT out and PT out amounts from the return values
      const approxYtOut = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const netSyTokenization = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[1][0],
        ),
      )

      const resultObj = {
        approxYtOut,
        netSyTokenization,
      }

      debugInfo.parsedOutput = `${approxYtOut},${netSyTokenization}`

      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
