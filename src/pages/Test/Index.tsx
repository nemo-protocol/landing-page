import Header from "@/components/Header"
import { PackageAddress } from "@/contract"
import { Transaction } from "@mysten/sui/transactions"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { useMemo, useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { truncateStr } from "@/lib/utils"
import Decimal from "decimal.js"

export default function Test() {
  const client = useSuiClient()
  const { currentWallet, connectionStatus } = useCurrentWallet()
  const [sSui, setSSUI] = useState<string>(
    "0x08a21bb5ab32c6c0ea2b9fef80fe47d9e66001c78498a8ae267d9b36f2a760b1",
  )
  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )
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
  const { data: suiData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: "0x2::sui::SUI",
    },
    {
      gcTime: 10000,
      enabled: !!address,
    },
  )

  const suiCoins = useMemo(() => {
    if (suiData) {
      return suiData.data.sort((a, b) =>
        new Decimal(a.balance).minus(b.balance).toNumber(),
      )
    }
  }, [suiData])
  return (
    <>
      <Header />
      <div className="py-4 gap-y-2">
        <div className="flex flex-col gap-y-2">
          <p>
            address: <span>{address}</span>
          </p>
          <p>
            sSUI: <span>{sSui}</span>
          </p>
          <p>
            SUI:
            {suiCoins && (
              <span>
                {suiCoins.map((coin) => (
                  <div
                    className="flex items-center gap-x-2"
                    key={coin.coinObjectId}
                  >
                    <span>{truncateStr(coin.coinObjectId, 4)}</span>
                    <span>{new Decimal(coin.balance).div(1e9).toNumber()}</span>
                  </div>
                ))}
              </span>
            )}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => {
                if (connectionStatus !== "connected") {
                  toast({
                    title: "Please connect wallet first",
                  })
                  return
                }
                const transaction = new Transaction()
                transaction.moveCall({
                  target: `${PackageAddress}::sy_sSui::create`,
                  arguments: [],
                  typeArguments: ["0x2::sui::SUI"],
                })
                transaction.setGasBudget(3000000)
                const { effects } = await signAndExecuteTransaction({
                  transaction,
                  chain: "sui:testnet",
                })
                setSSUI(effects?.created?.[0].reference.objectId || "")
              }}
            >
              create sSUI
            </button>
            <button
              onClick={async () => {
                if (connectionStatus !== "connected" || !address) {
                  toast({
                    title: "Please connect wallet first",
                  })
                  return
                } else if (!sSui) {
                  toast({
                    title: "Please create sSUI first",
                  })
                  return
                } else if (!suiCoins || suiCoins.length === 0) {
                  toast({
                    title: "Please get SUI first",
                  })
                  return
                }
                const tx = new Transaction()
                tx.moveCall({
                  target: `${PackageAddress}::sy_sSui::deposit`,
                  arguments: [
                    tx.pure.address(address),
                    tx.object(suiCoins[0].coinObjectId),
                    tx.pure.u64(
                      new Decimal(suiCoins[0].balance)
                        .mul(1 - 0.005)
                        .toNumber(),
                    ),
                    tx.object(sSui),
                  ],
                  typeArguments: ["0x2::sui::SUI"],
                })
                tx.setGasBudget(3000000)
                const data = await signAndExecuteTransaction({
                  transaction: tx,
                  chain: "sui:testnet",
                })
                console.log("data", data)
              }}
            >
              deposit sSUI
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
