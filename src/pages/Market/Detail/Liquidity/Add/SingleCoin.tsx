import Decimal from "decimal.js"
import { GAS_BUDGET, network } from "@/config"
import { useCoinConfig } from "@/queries"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { useParams } from "react-router-dom"
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

import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

export default function Mint({ slippage }: { slippage: string }) {
  const ratio = 1
  const client = useSuiClient()
  const { coinType } = useParams()
  // const [rate, setRate] = useState(1)
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [addValue, setAddValue] = useState("")
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

  const { data: coinData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: coinType!,
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

  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [coinData])

  const insufficientBalance = useMemo(
    () =>
      new Decimal(coinBalance).lt(
        new Decimal(addValue || 0).mul(new Decimal(ratio || 0).add(1)),
      ),
    [coinBalance, addValue, ratio],
  )

  async function add() {
    if (!insufficientBalance) {
      try {
        const tx = new Transaction()

        console.log("coinData", coinData)
        console.log(
          new Decimal(addValue)
            .mul(1e9)
            .mul(ratio)
            .div(new Decimal(ratio).add(1))
            .toString(),
          new Decimal(addValue)
            .mul(1e9)
            .mul(ratio)
            .div(new Decimal(ratio).add(1))
            .toString(),
          coinData!
            .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
            .toString(),
        )

        const [splitCoinForPY, splitCoin] = tx.splitCoins(
          coinData![0].coinObjectId,
          [
            new Decimal(addValue)
              .mul(1e9)
              .mul(ratio)
              .div(new Decimal(ratio).add(1))
              .toString(),
            new Decimal(addValue)
              .mul(1e9)
              .div(new Decimal(ratio).add(1))
              .toString(),
          ],
        )

        // tx.transferObjects([splitCoin, splitCoinForPY], address!)

        const [syCoinForPY] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            splitCoinForPY,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .mul(1 - Number(slippage))
                .toNumber(),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType!],
        })

        // tx.transferObjects([splitCoin, syCoinForPY], address!)

        const [ptCoin, ytCoin] = tx.moveCall({
          target: `${PackageAddress}::yield_factory::mintPY`,
          arguments: [
            tx.pure.address(address!),
            tx.pure.address(address!),
            syCoinForPY,
            tx.object(coinConfig!.syStructId),
            tx.object(coinConfig!.ptStructId),
            tx.object(coinConfig!.ytStructId),
            tx.object(coinConfig!.tokenConfigId),
            tx.object(coinConfig!.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })

        tx.transferObjects([ytCoin], address!)
        // tx.transferObjects([ptCoin, ytCoin, splitCoin], address!)

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit_with_coin_back`,
          arguments: [
            tx.pure.address(address!),
            splitCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .mul(1 - Number(slippage))
                .toNumber(),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType!],
        })

        // tx.transferObjects([syCoin, ptCoin], address!)

        tx.moveCall({
          target: `${PackageAddress}::market::mint_lp`,
          arguments: [
            tx.pure.address(address!),
            ptCoin,
            syCoin,
            tx.object(coinConfig!.yieldFactoryConfigId),
            tx.object(coinConfig!.syStructId),
            tx.object(coinConfig!.tokenConfigId),
            tx.object(coinConfig!.marketConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinType!],
        })

        tx.setGasBudget(GAS_BUDGET)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setAddValue("")
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
            <span>Balance: {isConnected ? coinBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
            <SSUIIcon className="size-6" />
            <span>sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            type="text"
            value={addValue}
            disabled={!isConnected}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder={!isConnected ? "Please connect wallet" : ""}
            className={`bg-transparent h-full outline-none grow text-right min-w-0`}
          />
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setAddValue(new Decimal(coinBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setAddValue(new Decimal(coinBalance!).toFixed(9))}
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
            <span>LP sSUI</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            disabled
            type="text"
            value={addValue}
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
          onClick={add}
          disabled={addValue === ""}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-3xl w-56",
            addValue === ""
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Add Liquidity
        </button>
      )}
    </div>
  )
}
