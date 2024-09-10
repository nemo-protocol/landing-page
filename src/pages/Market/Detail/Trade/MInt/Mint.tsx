import { useMemo, useState } from "react"
import AddIcon from "@/assets/images/svg/add.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import DownArrowIcon from "@/assets/images/svg/down-arrow.svg?react"
import {
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit"
import Decimal from "decimal.js"
import { truncateStr } from "@/lib/utils"
import { Transaction } from "@mysten/sui/transactions"
import { PackageAddress } from "@/contract"

export default function Mint() {
  const client = useSuiClient()
  const [syCoin, setSyCoin] = useState<string>("")
  const { currentWallet } = useCurrentWallet()
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
  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )
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
        new Decimal(b.balance).minus(a.balance).toNumber(),
      )
    }
  }, [suiData])

  async function merge() {
    if (suiCoins?.length) {
      try {
        const tx = new Transaction()

        const [splitCoin] = tx.splitCoins(tx.gas, [
          new Decimal(1.2).mul(1e9).toString(),
        ])

        // tx.transferObjects([splitCoin], address!)

        console.log("splitCoin", splitCoin)

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            splitCoin,
            tx.pure.u64(
              new Decimal(1.2)
                .mul(1e9)
                .mul(1 - 0.005)
                .toNumber(),
            ),
            tx.object(
              "0x58610cbfc52d6d90684ea5b6ac422a33ca560e929b58a32b5b007d645e3707cd",
            ),
          ],
          typeArguments: ["0x2::sui::SUI"],
        })

        console.log("syCoin", syCoin)

        tx.moveCall({
          target: `${PackageAddress}::yield_factory::mintPY`,
          arguments: [
            tx.pure.address(address!),
            tx.pure.address(address!),
            syCoin,
            tx.object(
              "0x58610cbfc52d6d90684ea5b6ac422a33ca560e929b58a32b5b007d645e3707cd",
            ),
            tx.object(
              "0xeeb3f1075fa9ccfadf0b3d6cca0b260d449381a982240dbd75802f8a5d909c09",
            ),
            tx.object(
              "0xdad07b12013733278c4e45f758847ea87a0fff08fd2885a6625e4e588d9615b2",
            ),
            tx.object(
              "0x46716d4af47d545330abded03e000c326d924ca4b03517732554f2de56a51628",
            ),
            tx.object(
              "0xa20a507c3713d03959800d94b56271ad5665068e44cac6033a4fa3210a7c92e5",
            ),
            tx.object("0x6"),
          ],
          typeArguments: ["0x2::sui::SUI"],
        })

        tx.setGasBudget(10000000)

        const data = await signAndExecuteTransaction({
          transaction: tx,
          chain: "sui:testnet",
        })
        console.log("data", data)
      } catch (error) {
        console.log("error", error)
      }
    }
  }

  async function deposit() {
    if (suiCoins?.length) {
      try {
        const tx = new Transaction()

        const [splitCoin] = tx.splitCoins(tx.gas, [
          new Decimal(1.2).mul(1e9).toString(),
        ])

        // tx.transferObjects([splitCoin], address!)

        console.log("splitCoin", splitCoin)

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit`,
          arguments: [
            tx.pure.address(address!),
            splitCoin,
            tx.pure.u64(
              new Decimal(1.2)
                .mul(1e9)
                .mul(1 - 0.005)
                .toNumber(),
            ),
            tx.object(
              "0x58610cbfc52d6d90684ea5b6ac422a33ca560e929b58a32b5b007d645e3707cd",
            ),
          ],
          typeArguments: ["0x2::sui::SUI"],
        })

        console.log("syCoin", syCoin)

        tx.setGasBudget(3000000)

        const data = await signAndExecuteTransaction({
          transaction: tx,
          chain: "sui:testnet",
        })
        console.log("data", data)
        console.log("objectId", data.effects?.created?.[0].reference.objectId)

        setSyCoin(data.effects?.created?.[0].reference.objectId || "")
      } catch (error) {
        console.log("error", error)
      }
    }
  }

  async function mint() {
    if (syCoin) {
      try {
        const tx = new Transaction()

        tx.moveCall({
          target: `${PackageAddress}::yield_factory::mintPY`,
          arguments: [
            tx.pure.address(address!),
            tx.pure.address(address!),
            tx.object(syCoin),
            tx.object(
              "0x58610cbfc52d6d90684ea5b6ac422a33ca560e929b58a32b5b007d645e3707cd",
            ),
            tx.object(
              "0xeeb3f1075fa9ccfadf0b3d6cca0b260d449381a982240dbd75802f8a5d909c09",
            ),
            tx.object(
              "0xdad07b12013733278c4e45f758847ea87a0fff08fd2885a6625e4e588d9615b2",
            ),
            tx.object(
              "0x46716d4af47d545330abded03e000c326d924ca4b03517732554f2de56a51628",
            ),
            tx.object(
              "0xa20a507c3713d03959800d94b56271ad5665068e44cac6033a4fa3210a7c92e5",
            ),
            tx.object("0x6"),
          ],
          typeArguments: ["0x2::sui::SUI"],
        })

        tx.setGasBudget(10000000)

        const data = await signAndExecuteTransaction({
          transaction: tx,
          chain: "sui:testnet",
        })
        console.log("data", data)
      } catch (error) {
        console.log("error", error)
      }
    }
  }

  return (
    <>
      <button onClick={() => merge()}>merge</button>
      <button onClick={() => deposit()}>deposit</button>
      <button onClick={() => mint()}>mint</button>
      {/* <button onClick={() => deposit()}>deposit</button> */}
      <div>syCoin:{syCoin}</div>
      <div>
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
      </div>
      <div className="flex items-center justify-between">
        <div className="text-white">Input</div>
        <div className="flex items-center gap-x-1">
          <WalletIcon />
          <span>Balance:1998.45</span>
        </div>
      </div>
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>sSUI</span>
          <DownArrowIcon />
        </div>
        <input
          type="text"
          className="bg-transparent h-full outline-none grow text-right"
        />
      </div>
      <div className="flex items-center gap-x-2 justify-end mt-3.5">
        <div className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer">
          Half
        </div>
        <div className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer">
          Max
        </div>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>PT sSUI</span>
          <DownArrowIcon />
        </div>
        <input
          type="text"
          className="bg-transparent h-full outline-none grow text-right"
        />
      </div>
      <AddIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>YT sSUI</span>
          <DownArrowIcon />
        </div>
        <input
          type="text"
          className="bg-transparent h-full outline-none grow text-right"
        />
      </div>
    </>
  )
}
