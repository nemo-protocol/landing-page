import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient } from "@nemoprotocol/wallet-kit"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "@/queries/types/market"
import { getPriceVoucher } from "@/lib/txHelper"

const useQuerySyAmountOut = (
  coinConfig: CoinConfig | undefined,
  address: string | undefined,
) => {
  const client = useSuiClient()

  return useMutation({
    mutationFn: async () => {
      if (!coinConfig || !address) {
        throw new Error("Missing required parameters")
      }

      const tx = new Transaction()
      const [priceVoucher] = getPriceVoucher(tx, coinConfig)
      tx.setSender(address)
      tx.moveCall({
        target: `${coinConfig.nemoContractId}::market::get_sy_amount_out_for_exact_yt_in_with_price_voucher`,
        arguments: [
          tx.pure.u64("1000000"), // exact_yt_in
          priceVoucher,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: [coinConfig.syCoinType],
      })

      try {
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

        const amount = bcs.U64.parse(
          new Uint8Array(result.results[1].returnValues[0][0]),
        )
        return amount.toString()
      } catch (error) {
        console.log("error", error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    },
  })
}

export default useQuerySyAmountOut 