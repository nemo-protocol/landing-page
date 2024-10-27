import Decimal from "decimal.js"
import { useEffect, useMemo, useState } from "react"
import { PackageAddress } from "@/contract"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useSuiClient,
  useCurrentWallet,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { useParams } from "react-router-dom"
import { GAS_BUDGET, network } from "@/config"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
import { debounce } from "@/lib/utils"
import { Info } from "lucide-react"
import dayjs from "dayjs"

export default function Mint({ slippage }: { slippage: string }) {
  const client = useSuiClient()
  const { coinType, tokenType: _tokenType } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [tokenType, setTokenType] = useState("pt")
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

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [])

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: coinConfig } = useCoinConfig(coinType!)
  const { data: ratio } = useQuerySwapRatio(
    coinConfig?.marketConfigId ?? "",
    tokenType,
    !!coinConfig?.marketConfigId,
  )

  const { data: coinData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: coinType!,
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
    () => new Decimal(coinBalance).lt(mintValue || 0),
    [coinBalance, mintValue],
  )

  async function mint() {
    if (!insufficientBalance && address && coinConfig && coinType) {
      try {
        const tx = new Transaction()

        if (!coinConfig?.pyPosition) {
          tx.moveCall({
            target: `${PackageAddress}::yield_factory::create`,
            arguments: [
              tx.object(coinConfig.pyStore),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.maturity),
              tx.object("0x6"),
            ],
            typeArguments: [coinType],
          })
          return
        }

        const [splitCoin] = tx.splitCoins(coinData![0].coinObjectId, [
          new Decimal(mintValue).mul(1e9).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy_sSui::deposit`,
          arguments: [
            splitCoin,
            tx.pure.u64(
              new Decimal(mintValue)
                .mul(1e9)
                .mul(1 - Number(slippage))
                .toNumber(),
            ),
            tx.object(coinConfig.pyState),
          ],
          typeArguments: [coinType],
        })

        if (coinType === "pt") {
          const [sy] = tx.moveCall({
            target: `${PackageAddress}::market::swap_sy_for_exact_pt`,
            arguments: [
              tx.pure.u64(
                new Decimal(mintValue)
                  .mul(1e9)
                  .mul(1 - Number(slippage))
                  .toNumber(),
              ),
              syCoin,
              tx.object(coinConfig.pyPosition),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig!.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinType!],
          })
          tx.transferObjects([sy], address)
        } else {
          const [sy] = tx.moveCall({
            target: `${PackageAddress}::market::swap_sy_for_exact_yt`,
            arguments: [
              tx.pure.u64(
                new Decimal(mintValue)
                  .mul(1e9)
                  .mul(1 - Number(slippage))
                  .toNumber(),
              ),
              syCoin,
              tx.object(coinConfig.pyPosition),
              tx.object(coinConfig.pyState),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig!.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinType!],
          })
          tx.transferObjects([sy], address)
        }

        tx.setGasBudget(GAS_BUDGET)

        const { digest } = await signAndExecuteTransaction({
          transaction: Transaction.from(tx),
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setMintValue("")
      } catch (error) {
        console.log("error", error)
      }
    }
  }

  const debouncedSetMintValue = debounce((value: string) => {
    setMintValue(value)
  }, 300)

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
        <div className="flex items-center justify-end w-full">
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
                debouncedSetMintValue(new Decimal(e.target.value).toString())
              }
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.sCoinPrice || 0)
                  .mul(mintValue || 0)
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
              setMintValue(new Decimal(coinBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setMintValue(new Decimal(coinBalance!).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <SwapIcon className="mx-auto" />
      <div className="flex flex-col w-full gap-y-4.5 mt-4">
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <Select
              value={tokenType}
              onValueChange={(value) => setTokenType(value)}
            >
              {/* <Select defaultValue="yt"> */}
              <SelectTrigger className="w-24 focus:ring-0 focus:border-none focus:outline-none bg-transparent">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="border-none outline-none bg-[#0E0F16]">
                <SelectGroup>
                  <SelectItem
                    value="pt"
                    className="cursor-pointer"
                    onClick={() => setTokenType("pt")}
                  >
                    PT sSUI
                  </SelectItem>
                  <SelectItem
                    value="yt"
                    className="cursor-pointer"
                    onClick={() => setTokenType("yt")}
                  >
                    YT sSUI
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            disabled
            type="text"
            value={
              mintValue && new Decimal(mintValue).mul(ratio || 0).toString()
            }
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      {/* <div className="bg-[#2426325C] px-6 py-4 flex items-center justify-between w-full mt-6 rounded-xl">
        <span className="text-white/80">Total Pool APY</span>
        <span>
          {tokenType === "pt" ? coinConfig?.ptApy || 0 : coinConfig?.ytApy || 0}
        </span>
      </div> */}
      {tokenType === "pt" && (
        <div className="bg-[#44E0C30F]/[0.08] px-6 py-4 flex flex-col gap-y-2 w-full mt-6 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[#44E0C3] text-sm">
              Fixed return after{" "}
              {dayjs(
                parseInt(coinConfig?.maturity || Date.now().toString()),
              ).diff(dayjs(), "day")}{" "}
              days
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#20283C] rounded-md border-none">
                  <p>
                    You can sell PT prior to maturity. Alternatively, you can
                    hold PT until maturity to obtain a fixed return.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <img
                className="size-6"
                src={
                  coinConfig?.coinLogo ||
                  "https://nemoprotocol.com/static/sui.svg"
                }
                alt=""
              />
              <div className="flex flex-col gap-y-0.5">
                <span className="text-white text-sm">
                  {mintValue || 0} {coinConfig?.coinLogo || "SUI"}
                </span>
                <span className="text-white/60 text-xs">
                  $
                  {new Decimal(mintValue || 0)
                    .mul(coinConfig?.coinPrice || 0)
                    .mul(ratio || 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
            <span className="text-[#44E0C3] text-sm">
              +
              {new Decimal(mintValue || 0)
                .mul(ratio || 0)
                .mul(coinConfig?.coinPrice || 0)
                .minus(
                  new Decimal(mintValue || 0).mul(coinConfig?.sCoinPrice || 0),
                )
                .toFixed(2)}
              {coinConfig?.coinLogo || "SUI"}
            </span>
          </div>
        </div>
      )}
      {insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-3xl w-56 cursor-pointer">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={mint}
          disabled={mintValue === ""}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-3xl w-56",
            mintValue === ""
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Buy
        </button>
      )}
    </div>
  )
}
