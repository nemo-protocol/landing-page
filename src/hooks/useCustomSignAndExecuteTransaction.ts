import { useMutation } from "@tanstack/react-query"
import { Transaction } from "@mysten/sui/transactions"
import { useSuiClient, useWallet } from "@aricredemption/wallet-kit"
import { SuiSignAndExecuteTransactionOutput } from "@mysten/wallet-standard"

interface SignAndExecuteParams {
  transaction: Transaction
  chain?: string
}

const useCustomSignAndExecuteTransaction = () => {
  const client = useSuiClient()
  const { signAndExecuteTransaction } = useWallet()

  return useMutation({
    mutationFn: async ({
      transaction,
    }: SignAndExecuteParams): Promise<SuiSignAndExecuteTransactionOutput> => {
      return signAndExecuteTransaction(
        {
          transaction,
        },
        {
          execute: async ({ bytes, signature }) =>
            await client.executeTransactionBlock({
              transactionBlock: bytes,
              signature,
              options: {
                showInput: false,
                showEvents: false,
                showEffects: true,
                showRawInput: false,
                showRawEffects: true,
                showObjectChanges: false,
                showBalanceChanges: false,
              },
            }),
        },
      )
    },
  })
}

export default useCustomSignAndExecuteTransaction
