import dayjs from "dayjs"
import Decimal from "decimal.js"
import { GAS_BUDGET, network } from "@/config"
import { Info } from "lucide-react"
// import { debounce } from "@/lib/utils"
import { useParams } from "react-router-dom"
import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"
import { useEffect, useMemo, useState } from "react"
import { Transaction } from "@mysten/sui/transactions"
// import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import useCoinData from "@/hooks/useCoinData"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"

export default function Mint({ slippage }: { slippage: string }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const [swapValue, setSwapValue] = useState("")
  const [tokenType, setTokenType] = useState("pt")
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const { currentWallet, isConnected } = useCurrentWallet()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [_tokenType])

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: coinConfig } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: ratio } = useQuerySwapRatio(
    coinConfig?.marketStateId,
    tokenType,
  )

  const { data: coinData } = useCoinData(address, coinType)
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
    () => new Decimal(coinBalance).lt(swapValue || 0),
    [coinBalance, swapValue],
  )

  async function mint() {
    if (
      coinType &&
      address &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${coinConfig.nemoContractId}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig.version),
              tx.object(coinConfig.pyStateId),
            ],
            typeArguments: [coinConfig.syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [splitCoin] = tx.splitCoins(coinData![0].coinObjectId, [
          new Decimal(swapValue).mul(1e9).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(swapValue)
                .mul(1e9)
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucher] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(coinConfig.providerVersion),
            tx.object(coinConfig.providerMarket),
            tx.object(coinConfig.syStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType, coinConfig.underlyingCoinType],
        })

        if (tokenType === "pt") {
          const [sy] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::swap_sy_for_exact_pt`,
            arguments: [
              tx.object(coinConfig.version),
              tx.pure.u64(
                new Decimal(swapValue)
                  .mul(1e9)
                  .mul(1 - new Decimal(slippage).div(100).toNumber())
                  .toNumber(),
              ),
              syCoin,
              priceVoucher,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })
          tx.transferObjects([sy], address)
        } else {
          const [sy] = tx.moveCall({
            target: `${coinConfig.nemoContractId}::market::swap_sy_for_exact_yt`,
            arguments: [
              tx.object(coinConfig.version),
              tx.pure.u64(
                new Decimal(swapValue)
                  .mul(1e9)
                  .mul(1 - new Decimal(slippage).div(100).toNumber())
                  .toNumber(),
              ),
              syCoin,
              priceVoucher,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.syStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
            typeArguments: [coinConfig.syCoinType],
          })
          tx.transferObjects([sy], address)
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        tx.setGasBudget(GAS_BUDGET)

        const res = await signAndExecuteTransaction({
          transaction: Transaction.from(tx),
          chain: `sui:${network}`,
        })
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setStatus("Success")
        setTxId(res.digest)
        setOpen(true)
        setSwapValue("")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  // const debouncedSetMintValue = debounce((value: string) => {
  //   setSwapValue(value)
  // }, 300)

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
              className="text-white w-36 rounded-3xl bg-[#0F60FF] py-1.5"
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
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className="size-6"
            />
            <span className="px-2">sSUI</span>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              type="text"
              value={swapValue}
              disabled={!isConnected}
              onChange={
                (e) => setSwapValue(e.target.value)
                // debouncedSetMintValue(new Decimal(e.target.value).toString())
              }
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.sCoinPrice || 0)
                  .mul(swapValue || 0)
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
              setSwapValue(new Decimal(coinBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setSwapValue(new Decimal(coinBalance!).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <SwapIcon className="mx-auto" />
      <div className="flex flex-col w-full gap-y-4.5 mt-4">
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className="size-6"
            />
            <Select
              value={tokenType}
              onValueChange={(value) => setTokenType(value)}
            >
              {/* <Select defaultValue="yt"> */}
              <SelectTrigger className="w-24 border-none focus:ring-0 focus:outline-none bg-transparent">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="border-none outline-none bg-[#0E0F16]">
                <SelectGroup>
                  <SelectItem
                    value="pt"
                    className="cursor-pointer text-white"
                    onClick={() => setTokenType("pt")}
                  >
                    PT {coinConfig?.coinName}
                  </SelectItem>
                  <SelectItem
                    value="yt"
                    className="cursor-pointer text-white"
                    onClick={() => setTokenType("yt")}
                  >
                    YT {coinConfig?.coinName}
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
              swapValue && new Decimal(swapValue).mul(ratio || 0).toString()
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
      {
        <div className="bg-[#44E0C30F]/[0.08] px-6 py-4 flex flex-col gap-y-2 w-full mt-6 rounded-lg">
          <div className="flex items-center justify-between">
            {tokenType === "pt" ? (
              <span className="text-[#44E0C3] text-sm">
                Fixed return after{" "}
                {dayjs(
                  parseInt(coinConfig?.maturity || Date.now().toString()),
                ).diff(dayjs(), "day")}{" "}
                days
              </span>
            ) : (
              <span className="text-[#44E0C3] text-sm">
                If underlying APY remains same
              </span>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#20283C] rounded-md border-none">
                  {tokenType === "pt" ? (
                    <p>
                      You can sell PT prior to maturity. Alternatively, you can
                      hold PT until maturity to obtain a fixed return.
                    </p>
                  ) : (
                    <p>
                      If the underlying APY increases, your actual returns will
                      also increase. Conversely, if it decreases, your returns
                      will be reduced.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center justify-between">
            {tokenType === "pt" ? (
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
                    {swapValue || 0} {coinConfig?.coinName}
                  </span>
                  <span className="text-white/60 text-xs">
                    $
                    {new Decimal(swapValue || 0)
                      .mul(coinConfig?.coinPrice || 0)
                      .mul(ratio || 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <span>YT APY</span>
            )}

            {tokenType === "pt" ? (
              <span className="text-[#44E0C3] text-sm">
                {new Decimal(swapValue || 0)
                  .mul(ratio || 0)
                  .mul(coinConfig?.coinPrice || 0)
                  .minus(
                    new Decimal(swapValue || 0).mul(
                      coinConfig?.sCoinPrice || 0,
                    ),
                  )
                  .toFixed(2)}
                &nbsp;
                {coinConfig?.coinName}
              </span>
            ) : (
              <span className="text-[#44E0C3] text-sm">
                {coinConfig?.ytApy ?? 0} %
              </span>
            )}
          </div>
        </div>
      }
      {!isConnected ? (
        <ConnectModal
          open={openConnect}
          onOpenChange={(isOpen) => setOpenConnect(isOpen)}
          trigger={
            <button className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-14 cursor-pointer">
              Connect Wallet
            </button>
          }
        />
      ) : insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-14 cursor-pointer">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={mint}
          disabled={swapValue === ""}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full h-14",
            swapValue === ""
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
