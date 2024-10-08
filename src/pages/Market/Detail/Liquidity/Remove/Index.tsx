import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { useParams } from "react-router-dom"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"

import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

export default function Remove() {
  const client = useSuiClient()
  const { coinType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [lpValue, setLpValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { currentWallet, isConnected } = useCurrentWallet()
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
  const { data: dataRatio } = useQueryLPRatio(
    coinConfig?.marketConfigId ?? "",
    {
      enabled: !!coinConfig?.marketConfigId,
    },
  )

  const { data: lpCoinData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::market::MarketLP<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address && !!coinType,
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const lpCoinBalance = useMemo(() => {
    if (lpCoinData?.length) {
      return lpCoinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [lpCoinData])

  const insufficientBalance = useMemo(
    () => new Decimal(lpCoinBalance).lt(new Decimal(lpValue || 0)),
    [lpCoinBalance, lpValue],
  )

  async function remove() {
    if (!insufficientBalance) {
      try {
        const tx = new Transaction()

        const [lpCoin] = tx.splitCoins(lpCoinData![0].coinObjectId, [
          new Decimal(lpValue).mul(1e9).toString(),
        ])

        tx.moveCall({
          target: `${PackageAddress}::market::burn_lp`,
          arguments: [
            tx.pure.address(address!),
            tx.pure.address(address!),
            tx.object(coinConfig!.marketConfigId),
            lpCoin,
            tx.object(coinConfig!.marketStateId),
          ],
          typeArguments: [coinType!],
        })

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setLpValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

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
            <span>Balance: {isConnected ? lpCoinBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
            <SSUIIcon className="size-6" />
            <span>LP sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            type="text"
            value={lpValue}
            disabled={!isConnected}
            onChange={(e) => setLpValue(e.target.value)}
            placeholder={!isConnected ? "Please connect wallet" : ""}
            className={`bg-transparent h-full outline-none grow text-right min-w-0`}
          />
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setLpValue(new Decimal(lpCoinBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setLpValue(new Decimal(lpCoinBalance!).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="flex flex-col w-full gap-y-4.5">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <span>sSUI</span>
          </div>
          <input
            disabled
            type="text"
            value={
              lpValue &&
              new Decimal(lpValue).div(dataRatio?.syLpRate || 0).toString()
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
          onClick={remove}
          disabled={lpValue === "" || insufficientBalance}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-3xl w-56",
            lpValue === "" || insufficientBalance
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Remove Liquidity
        </button>
      )}
    </div>
  )
}
