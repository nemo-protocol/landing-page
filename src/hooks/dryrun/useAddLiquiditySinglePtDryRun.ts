import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { useMutation } from "@tanstack/react-query"
import type { CoinData } from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import { getPriceVoucher } from "@/lib/txHelper"
import { debugLog } from "@/config"
import Decimal from "decimal.js"

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

  if (!coinConfig) {
    throw new Error("Please select a pool")
  }

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

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      const debugInfo: DebugInfo = {
        moveCall: {
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
        },
      }

      debugLog("single_liquidity_add_pt_out move call:", debugInfo.moveCall)

      tx.moveCall({
        target: debugInfo.moveCall.target,
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

      debugInfo.rawResult = {
        error: result?.error,
        results: result?.results,
      }

      console.log("result", result)

      if (!result?.results?.[0]?.returnValues?.[0]) {
        const message = "Failed to get pt value"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[0].returnValues[0][0]),
      )

      console.log("outputAmount", outputAmount)

      console.log(
        "outputAmount1",
        bcs.U64.parse(new Uint8Array(result.results[1].returnValues[0][0])),
      )

      const ptValue = new Decimal(outputAmount)
        .div(Math.pow(2, 64))
        // .mul(10 ** Number(coinConfig.decimal))
        .toFixed(0)

      console.log("ptValue", ptValue)

      debugInfo.parsedOutput = ptValue

      return (debug ? [ptValue, debugInfo] : ptValue) as DryRunResult<T>
    },
  })
}
