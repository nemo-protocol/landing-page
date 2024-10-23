import Decimal from "decimal.js"
import { network } from "@/config"
import { debounce } from "@/lib/utils"
import { useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { useParams } from "react-router-dom"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import FailIcon from "@/assets/images/svg/fail.svg?react"
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

export default function Mint({ slippage }: { slippage: string }) {
  const client = useSuiClient()
  const { coinType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [addValue, setAddValue] = useState("")
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
  const ratio = useMemo(() => dataRatio?.syLpRate, [dataRatio])
  // const ratio = 1

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
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  async function add() {
    if (!insufficientBalance && ratio && coinType && address) {
      try {
        const tx = new Transaction()
        const [splitCoinForPY, splitCoin] = tx.splitCoins(
          coinData![0].coinObjectId,
          [
            new Decimal(addValue)
              .mul(1e9)
              .div(new Decimal(ratio).add(1))
              .toFixed(0),
            new Decimal(addValue)
              .mul(1e9)
              .mul(ratio)
              .div(new Decimal(ratio).add(1))
              .toFixed(0),
          ],
        )

        const [syCoinForPY] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit`,
          arguments: [
            splitCoinForPY,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .div(new Decimal(ratio).add(1))
                .mul(1 - Number(slippage))
                .toFixed(0),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType],
        })

        const [ptCoin, ytCoin] = tx.moveCall({
          target: `${PackageAddress}::yield_factory::mint_py`,
          arguments: [
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

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit`,
          arguments: [
            splitCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .mul(ratio)
                .div(new Decimal(ratio).add(1))
                .mul(1 - Number(slippage))
                .toFixed(0),
            ),
            tx.object(coinConfig!.syStructId),
          ],
          typeArguments: [coinType!],
        })

        const [p, y, lp] = tx.moveCall({
          target: `${PackageAddress}::market::mint_lp`,
          arguments: [
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

        tx.transferObjects([p, y, lp], address!)

        // tx.setGasBudget(0.01 * 1e9)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setAddValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  // async function add() {
  //   if (!insufficientBalance && ratio) {
  //     try {
  //       const tx1 = new Transaction()
  //       const [splitCoinForPY, splitCoin] = tx1.splitCoins(
  //         coinData![0].coinObjectId,
  //         [
  //           new Decimal(addValue)
  //             .mul(1e9)
  //             .div(new Decimal(ratio).add(1))
  //             .toFixed(0),
  //           new Decimal(addValue)
  //             .mul(1e9)
  //             .mul(ratio)
  //             .div(new Decimal(ratio).add(1))
  //             .toFixed(0),
  //         ],
  //       )

  //       const [syCoin] = tx1.moveCall({
  //         target: `${PackageAddress}::sy_sSui::deposit`,
  //         arguments: [
  //           tx1.pure.address(address!),
  //           splitCoin,
  //           tx1.pure.u64(
  //             new Decimal(addValue)
  //               .mul(1e9)
  //               .mul(ratio)
  //               .div(new Decimal(ratio).add(1))
  //               .mul(1 - Number(slippage))
  //               .toFixed(0),
  //           ),
  //           tx1.object(coinConfig!.syStructId),
  //         ],
  //         typeArguments: [coinType!],
  //       })

  //       tx1.transferObjects([splitCoinForPY, syCoin], address!)

  //       const data = await signAndExecuteTransaction({
  //         transaction: tx1,
  //         chain: `sui:${network}`,
  //       })

  //       console.log("data", data)

  //       const sy = data!.effects!.created![0].reference.objectId
  //       const sSUIForPT = data!.effects!.created![1].reference.objectId

  //       console.log("sy", sy)
  //       console.log("sSUIForPT", sSUIForPT)

  //       const tx2 = new Transaction()

  //       const [syCoinForPY] = tx2.moveCall({
  //         target: `${PackageAddress}::sy_sSui::deposit`,
  //         arguments: [
  //           tx2.pure.address(address!),
  //           tx2.object(sSUIForPT),
  //           tx2.pure.u64(
  //             new Decimal(addValue)
  //               .mul(1e9)
  //               .div(new Decimal(ratio).add(1))
  //               .mul(1 - Number(slippage))
  //               .toFixed(0),
  //           ),
  //           tx2.object(coinConfig!.syStructId),
  //         ],
  //         typeArguments: [coinType!],
  //       })

  //       const [ptCoin, ytCoin] = tx2.moveCall({
  //         target: `${PackageAddress}::yield_factory::mintPY`,
  //         arguments: [
  //           tx2.pure.address(address!),
  //           tx2.pure.address(address!),
  //           syCoinForPY,
  //           tx2.object(coinConfig!.syStructId),
  //           tx2.object(coinConfig!.ptStructId),
  //           tx2.object(coinConfig!.ytStructId),
  //           tx2.object(coinConfig!.tokenConfigId),
  //           tx2.object(coinConfig!.yieldFactoryConfigId),
  //           tx2.object("0x6"),
  //         ],
  //         typeArguments: [coinType!],
  //       })

  //       tx2.transferObjects([ptCoin, ytCoin], address!)

  //       tx2.setGasBudget(0.01 * 1e9)

  //       const data1 = await signAndExecuteTransaction({
  //         transaction: tx2,
  //         chain: `sui:${network}`,
  //       })

  //       console.log(data1)

  //       const yt = data1!.effects!.created![0].reference.objectId
  //       const pt = data1!.effects!.created![1].reference.objectId

  //       console.log("pt", pt)
  //       console.log("yt", yt)

  //       const tx3 = new Transaction()

  //       tx3.moveCall({
  //         target: `${PackageAddress}::market::mint_lp`,
  //         arguments: [
  //           tx3.pure.address(address!),
  //           tx3.object(pt),
  //           tx3.object(sy),
  //           tx3.object(coinConfig!.yieldFactoryConfigId),
  //           tx3.object(coinConfig!.syStructId),
  //           tx3.object(coinConfig!.tokenConfigId),
  //           tx3.object(coinConfig!.marketConfigId),
  //           tx3.object(coinConfig!.marketStateId),
  //           tx3.object("0x6"),
  //         ],
  //         typeArguments: [coinType!],
  //       })

  //       tx3.setGasBudget(0.01 * 1e9)

  //       const data2 = await signAndExecuteTransaction({
  //         transaction: tx3,
  //         chain: `sui:${network}`,
  //       })

  //       setTxId(data2.digest)
  //       setOpen(true)
  //       debouncedSetAddValue("")
  //       setStatus("Success")
  //     } catch (error) {
  //       setOpen(true)
  //       setStatus("Failed")
  //       setMessage((error as Error)?.message ?? error)
  //     }
  //   }
  // }

  const debouncedSetAddValue = debounce((value: string) => {
    setAddValue(value)
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
            <span>Balance: {isConnected ? coinBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
            <SSUIIcon className="size-6" />
            <span className="px-2">sSUI</span>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              type="text"
              disabled={!isConnected}
              onChange={(e) =>
                debouncedSetAddValue(new Decimal(e.target.value).toString())
              }
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.sCoinPrice || 0)
                  .mul(addValue || 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
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
            <span className="px-2">LP sSUI</span>
          </div>
          <input
            disabled
            type="text"
            value={
              addValue &&
              new Decimal(addValue).mul(dataRatio?.syLpRate || 0).toString()
            }
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      <div className="bg-[#2426325C] px-6 py-4 flex items-center justify-between w-full mt-6 rounded-xl">
        <span className="text-white/80">Total Pool APY</span>
        <span>{coinConfig?.lpApy || 0}</span>
      </div>
      {insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-3xl w-56 cursor-pointer">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={add}
          disabled={
            addValue === "" || Number(addValue) <= 0 || insufficientBalance
          }
          className={[
            "mt-7.5 px-8 py-2.5 rounded-3xl w-56",
            addValue === "" || Number(addValue) <= 0 || insufficientBalance
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
