import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"

export default function useQueryLpOutByMintLp(coinConfig?: CoinConfig, address?: string) {
  const client = useSuiClient()

  return useMutation({
    mutationFn: async (inputAmount: string) => {
      if (!coinConfig || !address) {
        throw new Error("Missing required parameters")
      }

      const tx = new Transaction()
      tx.setSender(address)
      tx.moveCall({
        target: `${coinConfig.nemoContractId}::market::get_lp_out_for_mint_lp`,
        arguments: [
          tx.pure.u64(inputAmount), // net_sy_in
          tx.pure.u64("0"), // min_lp_out
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

      if (result?.error) {
        throw new Error(result.error)
      }

      if (!result?.results?.[1]?.returnValues?.[0]) {
        throw new Error("Failed to get LP amount")
      }

      const outputAmount = bcs.U64.parse(
        new Uint8Array(result.results[1].returnValues[0][0]),
      )
      return outputAmount.toString()
    }
  })
} 