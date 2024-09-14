import Decimal from "decimal.js"
import Header from "@/components/Header"
import { truncateStr } from "@/lib/utils"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { toast } from "@/components/ui/use-toast"
import { Transaction } from "@mysten/sui/transactions"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { network } from "@/config"
import { useCoinConfig } from "@/queries"

export default function Test() {
  const client = useSuiClient()
  const coinType =
    "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI"

  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction({
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

    const { data: coinConfig } = useCoinConfig(coinType)

    const test = async () => {
      if (coinConfig && coinType) {
        const tx = new Transaction()
        console.log(coinConfig, coinType)
        console.log(1111)
  
        tx.moveCall({
          target: `${PackageAddress}::market::current_exchange_rate`,
          arguments: [
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig.syStructId),
            tx.object(coinConfig.tokenConfigId),
            tx.object(coinConfig.marketConfigId),
            tx.object(coinConfig.marketStateId),
            tx.object(coinConfig.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })
  
        console.log(222)
  
        tx.setGasBudget(10000000)
  
        signAndExecuteTransaction(
          {
            transaction: tx,
            chain: `sui:${network}`,
          },
          {
            onSuccess: (data) => {
              console.log(data)
            },
          },
        ).then((data) => {
          console.log("data", data)
        })
      }
    }

  return <div></div>
}
