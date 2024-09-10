import Decimal from "decimal.js"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { Transaction } from "@mysten/sui/transactions"
import AddIcon from "@/assets/images/svg/add.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
// import FailIcon from "@/assets/images/svg/fail.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { useParams } from "react-router-dom"
// import { useCoinConfig } from "@/queries"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Mint({ slippage }: { slippage: string }) {
  const client = useSuiClient()
  const { coinType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { currentWallet, isConnected } = useCurrentWallet()
  const [mintValue, setMintValue] = useState("")
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

  // const { data: coinConfig } = useCoinConfig(coinType!)
  const coinConfig = {
    coinType: coinType!,
    syStructId:
      "0x58610cbfc52d6d90684ea5b6ac422a33ca560e929b58a32b5b007d645e3707cd",
    ptStructId:
      "0xeeb3f1075fa9ccfadf0b3d6cca0b260d449381a982240dbd75802f8a5d909c09",
    ytStructId:
      "0xdad07b12013733278c4e45f758847ea87a0fff08fd2885a6625e4e588d9615b2",
    tokenConfigId:
      "0x46716d4af47d545330abded03e000c326d924ca4b03517732554f2de56a51628",
    yieldFactoryConfigId:
      "0xa20a507c3713d03959800d94b56271ad5665068e44cac6033a4fa3210a7c92e5",
  }

  const { data: coinBalance } = useSuiClientQuery(
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

  const balance = useMemo(() => {
    if (coinBalance?.data.length) {
      return new Decimal(coinBalance?.data?.[0].balance).div(1e9).toFixed(9)
    }
    return 0
  }, [coinBalance])

  const suiCoins = useMemo(() => {
    if (suiData?.data) {
      return suiData.data.sort((a, b) =>
        new Decimal(b.balance).minus(a.balance).toNumber(),
      )
    }
  }, [suiData])

  async function mint() {
    if (suiCoins?.length) {
      try {
        const tx = new Transaction()

        const [splitCoin] = tx.splitCoins(tx.gas, [
          new Decimal(mintValue).mul(1e9).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            splitCoin,
            tx.pure.u64(
              new Decimal(mintValue)
                .mul(1e9)
                .mul(1 - Number(slippage))
                .toNumber(),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType!],
        })

        // const data = await signAndExecuteTransaction({
        //   transaction: tx,
        //   chain: "sui:testnet",
        // })
        // console.log("data", data)
        // console.log("objectId", data.effects?.created?.[0].reference.objectId)

        tx.moveCall({
          target: `${PackageAddress}::yield_factory::mintPY`,
          arguments: [
            tx.pure.address(address!),
            tx.pure.address(address!),
            syCoin,
            // tx.object(data.effects!.created![0].reference.objectId!),
            tx.object(coinConfig!.syStructId),
            tx.object(coinConfig!.ptStructId),
            tx.object(coinConfig!.ytStructId),
            tx.object(coinConfig!.tokenConfigId),
            tx.object(coinConfig!.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })

        tx.setGasBudget(10000000)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: "sui:testnet",
        })
        setTxId(digest)
        setOpen(true)
        setMintValue("")
      } catch (error) {
        console.log("error", error)
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[#0e0f15] border-none rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-white">
              Success
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center">
              <SuccessIcon />
              <div className="py-2 flex flex-col items-center">
                <p className=" text-white/50">Transaction submitted!</p>
                <a
                  className="text-[#8FB5FF] underline"
                  href={`https://suiscan.xyz/testnet/tx/${txId}`}
                  target="_blank"
                >
                  View details
                </a>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-center">
            <button
              className="text-white w-36 rounded-3xl bg-[#0F60FF]"
              onClick={() => setOpen(false)}
            >
              OK
            </button>
          </div>
          <AlertDialogFooter></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between w-full">
        <div className="text-white">Input</div>
        {isConnected ? (
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {balance}</span>
          </div>
        ) : (
          <span>Please connect wallet</span>
        )}
      </div>
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>sSUI</span>
          {/* <DownArrowIcon /> */}
        </div>
        <input
          type="text"
          value={mintValue}
          disabled={!address}
          onChange={(e) => setMintValue(e.target.value)}
          className={`bg-transparent h-full outline-none grow text-right min-w-0`}
        />
      </div>
      <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
        <button
          className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
          disabled={!balance}
          onClick={() => setMintValue(new Decimal(balance!).div(2).toFixed(9))}
        >
          Half
        </button>
        <button
          className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
          disabled={!balance}
          onClick={() => setMintValue(new Decimal(balance!).toFixed(9))}
        >
          Max
        </button>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
          <SSUIIcon className="size-6" />
          <span>PT sSUI</span>
          {/* <DownArrowIcon /> */}
        </div>
        <input
          disabled
          type="text"
          value={mintValue}
          className="bg-transparent h-full outline-none grow text-right min-w-0"
        />
      </div>
      <AddIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
          <SSUIIcon className="size-6" />
          <span>YT sSUI</span>
          {/* <DownArrowIcon /> */}
        </div>
        <input
          disabled
          type="text"
          value={mintValue}
          className="bg-transparent h-full outline-none grow text-right min-w-0"
        />
      </div>
      <button
        className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] rounded-3xl w-56"
        onClick={mint}
      >
        Mint
      </button>
    </div>
  )
}
