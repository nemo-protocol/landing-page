import { ContractError } from "../types"
import type { DebugInfo, MoveCallInfo } from "../types"
import { CoinData } from "@/types"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { TransactionResult } from "@mysten/sui/transactions"
import { mintSCoin } from "@/lib/txHelper"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"

interface MintSCoinParams {
  coinData: CoinData[]
  amounts: string[]
}

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionResult[], DebugInfo]
  : TransactionResult[]

export default function useMintSCoin<T extends boolean = false>(
  coinConfig: CoinConfig | undefined,
  debug: T = false as T,
) {
  const { address } = useWallet()
  const { mutateAsync: signAndExecute } = useCustomSignAndExecuteTransaction()

  return useMutation({
    mutationFn: async ({
      coinData,
      amounts,
    }: MintSCoinParams): Promise<MintSCoinResult<T>> => {
      if (!address) {
        throw new Error("Please connect wallet first")
      }
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      const tx = new Transaction()
      tx.setSender(address)

      const result = mintSCoin(tx, coinConfig, coinData, amounts, debug)
      const coins = debug
        ? (result as [TransactionArgument[], MoveCallInfo[]])[0]
        : (result as TransactionArgument[])

      tx.transferObjects(coins, address)

      const txResult = await signAndExecute({
        transaction: tx,
      })

      if (!txResult?.digest) {
        const message = "Failed to mint SCoin"
        throw new ContractError(message, {
          moveCall: debug
            ? [(result as [TransactionArgument[], MoveCallInfo[]])[1][0]]
            : [{
                target: "",
                arguments: [],
                typeArguments: [],
              }],
          rawResult: {
            error: "Transaction failed",
            results: txResult?.effects ? [txResult.effects] : [],
          },
        })
      }

      const debugInfo: DebugInfo = {
        moveCall: [(result as [TransactionArgument[], MoveCallInfo[]])[1][0]],
        rawResult: {
          error: undefined,
          results: txResult?.effects ? [txResult.effects] : [],
        },
      }

      return (debug
        ? [coins, debugInfo]
        : coins) as MintSCoinResult<T>
    },
  })
}
