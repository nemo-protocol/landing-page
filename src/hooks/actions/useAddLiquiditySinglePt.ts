import { getPriceVoucher } from "@/lib/txHelper"
import { CoinConfig } from "@/queries/types/market"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Transaction } from "@mysten/sui/transactions"
import { useMutation, UseMutationResult } from "@tanstack/react-query"
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard'

export default function useAddLiquiditySinglePt(
  coinConfig?: CoinConfig
): UseMutationResult<SuiSignAndExecuteTransactionOutput, Error, string, unknown> {
  const { signAndExecuteTransaction } = useWallet()
  return useMutation({
    mutationFn: async (netSyIn: string) => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      if (!signAndExecuteTransaction) {
        throw new Error("signAndExecuteTransaction is required")
      }

      const tx = new Transaction()

      const [priceVoucher] = getPriceVoucher(tx, coinConfig)

      tx.moveCall({
        target: `${coinConfig.nemoContractId}::offchain::single_liquidity_add_pt_out`,
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

      tx.setGasBudget(10000000)

      return await signAndExecuteTransaction({
        transaction: tx,
      })
    },
  })
}
