import { SuiTransactionBlockResponse } from "@mysten/sui/client"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"

const useCustomSignAndExecuteTransaction = (): ReturnType<
  typeof useSignAndExecuteTransaction<SuiTransactionBlockResponse>
> => {
  const client = useSuiClient()

  return useSignAndExecuteTransaction({
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
  })
}

export default useCustomSignAndExecuteTransaction
