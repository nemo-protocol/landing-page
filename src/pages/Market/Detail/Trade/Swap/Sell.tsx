import Decimal from "decimal.js"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { Transaction } from "@mysten/sui/transactions"
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

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GAS_BUDGET, network } from "@/config"
import { useCoinConfig } from "@/queries"

export default function Mint({ slippage }: { slippage: string }) {
  const client = useSuiClient()
  const { coinType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { currentWallet, isConnected } = useCurrentWallet()
  const [redeemValue, setRedeemValue] = useState("")
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

  const ptBalance = useMemo(() => {
    if (ptData?.length) {
      return ptData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [ptData])

  const insufficientBalance = useMemo(
    () => new Decimal(Number(ptBalance)).lt(redeemValue || 0),
    [ptBalance, redeemValue],
  )

  async function redeem() {
    if (!insufficientBalance) {
      try {
        const tx = new Transaction()

        const [ptCoin] = tx.splitCoins(ptData![0].coinObjectId, [
          new Decimal(redeemValue).mul(1e9).toString(),
        ])

        // tx.transferObjects([ptCoin], address!)

        tx.moveCall({
          target: `${PackageAddress}::market::swap_exact_pt_for_sy`,
          arguments: [
            tx.pure.address(address!),
            tx.object(coinConfig!.marketFactoryConfigId),
            tx.object(coinConfig!.yieldFactoryConfigId),
            ptCoin,
            tx.object(coinConfig!.syStructId),
            tx.object(coinConfig!.tokenConfigId),
            tx.object(coinConfig!.marketConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })

        // tx.transferObjects([syCoin], address!)

        // tx.moveCall({
        //   target: `${PackageAddress}::sy_sSui::redeem_with_coin_back`,
        //   arguments: [
        //     tx.pure.address(address!),
        //     syCoin,
        //     tx.pure.u64(
        //       new Decimal(redeemValue)
        //         .mul(1e9)
        //         .mul(1 - Number(slippage))
        //         .toNumber(),
        //     ),
        //     tx.object(coinConfig!.syStructId),
        //   ],
        //   typeArguments: [coinType!],
        // })

        // tx.transferObjects([sCoin], address!)

        tx.setGasBudget(GAS_BUDGET)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setRedeemValue("")
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
                  href={`https://suiscan.xyz/${network}/tx/${txId}`}
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
            value={redeemValue}
            disabled={!isConnected}
            onChange={(e) => setRedeemValue(e.target.value)}
            placeholder={!isConnected ? "Please connect wallet" : ""}
            className={`bg-transparent h-full outline-none grow text-right min-w-0`}
          />
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setRedeemValue(new Decimal(ptBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setRedeemValue(new Decimal(ptBalance!).toFixed(9))}
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
            value={redeemValue}
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
            redeemValue === ""
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
          disabled={redeemValue === ""}
        >
          Sell
        </button>
      )}
    </div>
  )
}
