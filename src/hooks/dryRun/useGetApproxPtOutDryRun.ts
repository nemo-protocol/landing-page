import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import { getPriceVoucher } from "@/lib/txHelper/price"
import { debugLog } from "@/config"

interface GetApproxPtOutParams {
  netSyIn: string
  minPtOut: string
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useGetApproxPtOutDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      netSyIn,
      minPtOut,
    }: GetApproxPtOutParams): Promise<DryRunResult<T>> => {
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
        target: `${coinConfig.nemoContractId}::offchain::get_approx_pt_out_for_net_sy_in_internal`,
        arguments: [
          { name: "net_sy_in", value: netSyIn },
          { name: "min_pt_out", value: minPtOut },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      debugLog("get_approx_pt_out move call:", moveCallInfo)

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(netSyIn),
          tx.pure.u64(minPtOut),
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
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

      console.log("useGetApproxPtOutDryRun result", result)

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherMoveCall, moveCallInfo],
        rawResult: result,
      }

      if (!result?.results?.[result.results.length - 1]?.returnValues?.[0]) {
        const message = "Failed to get pt output amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const approxPtOut = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      debugInfo.parsedOutput = approxPtOut

      return (debug ? [approxPtOut, debugInfo] : approxPtOut) as DryRunResult<T>
    },
  })
}
