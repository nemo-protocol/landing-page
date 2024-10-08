import Decimal from "decimal.js"
import { debounce } from "@/lib/utils"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { Transaction } from "@mysten/sui/transactions"
import AddIcon from "@/assets/images/svg/add.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { useParams } from "react-router-dom"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { network } from "@/config"
import { useCoinConfig, useQueryMintPYRatio } from "@/queries"

export default function Mint({ slippage }: { slippage: string }) {
  const client = useSuiClient()
  const { coinType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { currentWallet, isConnected } = useCurrentWallet()
  const [ptRedeemValue, setPTRedeemValue] = useState("")
  const [ytRedeemValue, setYTRedeemValue] = useState("")
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

  const { data: coinConfig } = useCoinConfig(coinType!)

  const { data: mintPYRatio } = useQueryMintPYRatio(
    coinConfig?.marketConfigId ?? "",
  )

  const ptytRatio = useMemo(() => {
    if (mintPYRatio) {
      return new Decimal(mintPYRatio?.syYtRate)
        .div(mintPYRatio?.syPtRate)
        .toString()
    }
    return 0
  }, [mintPYRatio])

  const { data: ptData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::pt::PTCoin<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address,
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const { data: ytData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::yt::YTCoin<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address,
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const ptBalance = useMemo(() => {
    if (ptData?.length) {
      return ptData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [ptData])

  const ytBalance = useMemo(() => {
    if (ytData?.length) {
      return ytData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [ytData])

  const insufficientBalance = useMemo(() => {
    return (
      new Decimal(ptBalance).lt(ptRedeemValue || 0) ||
      new Decimal(ytBalance).lt(ytRedeemValue || 0)
    )
  }, [ptBalance, ytBalance, ptRedeemValue, ytRedeemValue])

  async function redeem() {
    if (!insufficientBalance) {
      try {
        const tx = new Transaction()

        const [ptCoin] = tx.splitCoins(ptData![0].coinObjectId, [
          new Decimal(ptRedeemValue).mul(1e9).toString(),
        ])
        const [ytCoin] = tx.splitCoins(ytData![0].coinObjectId, [
          new Decimal(ytRedeemValue).mul(1e9).toString(),
        ])

        const [a, b, syCoin] = tx.moveCall({
          target: `${PackageAddress}::yield_factory::redeemPY_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            ptCoin,
            ytCoin,
            tx.object(coinConfig!.syStructId),
            tx.object(coinConfig!.tokenConfigId),
            tx.object(coinConfig!.ptStructId),
            tx.object(coinConfig!.ytStructId),
            tx.object(coinConfig!.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })

        tx.transferObjects([a, b], address!)

        const [sCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::redeem_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            syCoin,
            tx.pure.u64(
              new Decimal(ptRedeemValue)
                .mul(1e9)
                .mul(1 - Number(slippage))
                .toNumber(),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType!],
        })

        tx.transferObjects([sCoin], address!)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setPTRedeemValue("")
        setYTRedeemValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  const debouncedSetPTValue = debounce((value: string) => {
    setPTRedeemValue(value)
    setYTRedeemValue(new Decimal(value).div(ptytRatio).toFixed(9))
  }, 300)

  const debouncedSetYTValue = debounce((value: string) => {
    setYTRedeemValue(value)
    setPTRedeemValue(new Decimal(value).mul(ptytRatio).toFixed(9))
  }, 300)

  return (
    <div className="flex flex-col items-center">
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[#0e0f15] border-none rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-white">
              {status}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center">
              {status === "Success" ? <SuccessIcon /> : <FailIcon />}
              {status === "Success" && (
                <div className="py-2 flex flex-col items-center">
                  <p className=" text-white/50">Transaction submitted!</p>
                  <a
                    className="text-[#8FB5FF] underline"
                    href={`https://suiscan.xyz/${network}/tx/${txId}`}
                    target="_blank"
                  >
                    View details
                  </a>
                </div>
              )}
              {status === "Failed" && (
                <div className="py-2 flex flex-col items-center">
                  <p className=" text-red-400">Transaction Error</p>
                  <p className="text-red-500 break-all">{message}</p>
                </div>
              )}
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
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between w-full">
          <div className="text-white">Input</div>
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? ptBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <span>PT sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            type="text"
            value={ptRedeemValue}
            disabled={!isConnected}
            onChange={(e) => debouncedSetPTValue(e.target.value)}
            placeholder={!isConnected ? "Please connect wallet" : ""}
            className={`bg-transparent h-full outline-none grow text-right min-w-0`}
          />
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setPTRedeemValue(new Decimal(ptBalance).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setPTRedeemValue(new Decimal(ptBalance).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <AddIcon className="mx-auto" />
      <div className="flex flex-col w-full mt-[18px]">
        <div className="flex items-center justify-end w-full">
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? ytBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <span>YT sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            type="text"
            value={ytRedeemValue}
            disabled={!isConnected}
            onChange={(e) => debouncedSetYTValue(e.target.value)}
            placeholder={!isConnected ? "Please connect wallet" : ""}
            className={`bg-transparent h-full outline-none grow text-right min-w-0`}
          />
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setYTRedeemValue(new Decimal(ytBalance).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setYTRedeemValue(new Decimal(ytBalance).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="flex flex-col gap-y-4.5 w-full">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <span>sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            disabled
            type="text"
            value={
              (ptRedeemValue || ytRedeemValue) &&
              Math.min(
                new Decimal(ptRedeemValue || 0)
                  .div(mintPYRatio?.syPtRate ?? 1)
                  .toNumber(),
                new Decimal(ytRedeemValue || 0)
                  .div(mintPYRatio?.syYtRate ?? 1)
                  .toNumber(),
              ).toFixed(9)
            }
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      {insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-3xl w-56 cursor-pointer">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={redeem}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-3xl w-56",
            ptRedeemValue === "" || ytRedeemValue === "" || insufficientBalance
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
          disabled={
            ptRedeemValue === "" || ytRedeemValue === "" || insufficientBalance
          }
        >
          Redeem
        </button>
      )}
    </div>
  )
}
