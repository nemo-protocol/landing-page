import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import type { CoinConfig } from "@/queries/types/market"
import { useSuiClient, useWallet } from "@nemoprotocol/wallet-kit"
import type { DebugInfo } from "../types"
import { ContractError } from "../types"
import { mintSCoin, getCoinValue } from "@/lib/txHelper/coin"
import { CoinData } from "@/types"
import { bcs } from "@mysten/sui/bcs"
import Decimal from "decimal.js"
import { debugLog } from "@/config"

interface MintAndGetCoinValueParams {
  amount: string
  vaultId?: string
  slippage: string
  coinData: CoinData[]
}

type Result = { coinValue: string; coinAmount: string }

type DryRunResult<T extends boolean> = T extends true
  ? [Result, DebugInfo]
  : Result

export default function useMintSCoinDryRun<T extends boolean = false>(
  coinConfig?: CoinConfig,
  debug: T = false as T,
) {
  const client = useSuiClient()
  const { address } = useWallet()

  return useMutation({
    mutationFn: async ({
      amount,
      vaultId,
      slippage,
      coinData,
    }: MintAndGetCoinValueParams): Promise<DryRunResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select token first")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const [sCoin, mintMoveCallInfos] = await mintSCoin({
        tx,
        amount,
        vaultId,
        address,
        slippage,
        coinData,
        coinConfig,
        debug: true,
      })

      const [, getCoinValueMoveCallInfo] = getCoinValue(
        tx,
        sCoin,
        coinConfig.coinType,
        true,
      )

      const result = await client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: client,
          onlyTransactionKind: true,
        }),
      })

      const debugInfo: DebugInfo = {
        moveCall: [...mintMoveCallInfos, getCoinValueMoveCallInfo],
        rawResult: result,
      }

      if (result?.error) {
        debugLog(`useMintSCoinDryRun error:`, debugInfo)
        throw new ContractError(result.error, debugInfo)
      }

      if (!debug) {
        debugLog(`useMintSCoinDryRun debug info:`, debugInfo)
      }

      if (
        result.results[result.results.length - 1].returnValues[0][1] !== "u64"
      ) {
        const message = "Failed to get coin amount"
        debugInfo.rawResult.error = message
        throw new ContractError(message, debugInfo)
      }

      const coinAmount = bcs.U64.parse(
        new Uint8Array(
          result.results[result.results.length - 1].returnValues[0][0],
        ),
      )

      const decimal = Number(coinConfig.decimal)

      const coinValue = new Decimal(coinAmount)
        .div(10 ** decimal)
        .toFixed(decimal)

      debugInfo.parsedOutput = coinValue

      const resultObj = {
        coinValue,
        coinAmount,
      }

      return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
    },
  })
}
