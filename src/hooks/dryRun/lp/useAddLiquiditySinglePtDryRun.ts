import { debugLog } from "@/config"
import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "../../types"
import type { DebugInfo } from "../../types"
import { getPriceVoucher } from "@/lib/txHelper"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/types"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"

interface AddLiquiditySinglePtParams {
  netSyIn: string
  coinData: CoinData[]
}

type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export default function useAddLiquiditySinglePtDryRun<
  T extends boolean = false,
>(coinConfig?: CoinConfig, debug: T = false as T) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      coinData,
      netSyIn,
    }: AddLiquiditySinglePtParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!coinData?.length) {
        throw new Error("No available coins")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [priceVoucher, priceVoucherInfo] = getPriceVoucher(tx, coinConfig)

      const moveCallInfo = {
        target: `${coinConfig.nemoContractId}::offchain::single_liquidity_add_pt_out`,
        arguments: [
          { name: "net_sy_in", value: netSyIn },
          { name: "price_voucher", value: "priceVoucher" },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      }

      tx.moveCall({
        target: moveCallInfo.target,
        arguments: [
          tx.pure.u64(netSyIn),
          priceVoucher,
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.pyStateId),
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

      const debugInfo: DebugInfo = {
        moveCall: [priceVoucherInfo, moveCallInfo],
        rawResult: result,
      }

      if (result.error) {
        debugLog("single_liquidity_add_pt_out error:", debugInfo)
        throw new ContractError(result.error, debugInfo)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        const message = "Failed to get pt value"
        if (debugInfo.rawResult) {
          debugInfo.rawResult.error = message
        }
        debugLog("single_liquidity_add_pt_out error:", debugInfo)
        throw new ContractError(message, debugInfo)
      }

      const ptAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )

      debugInfo.parsedOutput = ptAmount

      if (!debug) {
        debugLog("single_liquidity_add_pt_out debugInfo:", debugInfo)
      }

      return (debug ? [ptAmount, debugInfo] : ptAmount) as DryRunResult<T>
    },
  })
}
