import Decimal from "decimal.js"
import { useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { network } from "@/config"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
// import { debounce } from "@/lib/utils"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"

export default function Sell({ slippage }: { slippage: string }) {
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState("pt")
  const { currentWallet, isConnected } = useCurrentWallet()
  const [redeemValue, setRedeemValue] = useState("")
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()
  const [openConnect, setOpenConnect] = useState(false)

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

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const insufficientBalance = useMemo(
    () =>
      tokenType == "pt"
        ? new Decimal(Number(ptBalance)).lt(redeemValue || 0)
        : new Decimal(Number(ytBalance)).lt(redeemValue || 0),
    [ptBalance, ytBalance, redeemValue, tokenType],
  )

  async function redeem() {
    if (!insufficientBalance && coinConfig && coinType && address) {
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

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::swap_exact_${tokenType}_for_sy`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(new Decimal(redeemValue).mul(1e9).toString()),
            pyPosition,
            tx.object(coinConfig.pyStateId),
            priceVoucher,
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig.marketFactoryConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        const [sCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::redeem`,
          arguments: [
            tx.object(coinConfig.version),
            syCoin,
            // FIXME: This is a temporary fix for the slippage issue
            // tx.pure.u64(new Decimal(redeemValue)
            // .div(ratio || 0)
            // .mul(10 ** coinConfig.decimal)
            // .mul(1 - new Decimal(slippage).div(100).toNumber())
            // .toFixed(0)),
            tx.pure.u64(0),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        tx.transferObjects([sCoin], address)

        // tx.setGasBudget(10000000)

        const res = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setTxId(res.digest)
        setOpen(true)
        setRedeemValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  // const debouncedSetRedeemValue = debounce((value: string) => {
  //   setRedeemValue(value)
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
        <div className="flex items-center justify-between w-full">
          <div className="text-white">Input</div>
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>
              Balance:{" "}
              {isConnected
                ? tokenType === "pt"
                  ? ptBalance
                  : ytBalance
                : "--"}
            </span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
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
              <SelectTrigger className="w-24 focus:ring-0 focus:border-none focus:outline-none bg-transparent border-none">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="bg-black border-none shadow-lg">
                <SelectGroup>
                  <SelectItem value="pt" className="cursor-pointer text-white">
                    PT {coinConfig?.coinName}
                  </SelectItem>
                  <SelectItem value="yt" className="cursor-pointer text-white">
                    YT {coinConfig?.coinName}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              type="text"
              value={redeemValue}
              disabled={!isConnected}
              onChange={(e) => setRedeemValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(
                  tokenType === "pt"
                    ? coinConfig?.ptPrice || 0
                    : coinConfig?.ytPrice || 0,
                )
                  .mul(redeemValue || 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected || !ptBalance}
            onClick={() =>
              setRedeemValue(new Decimal(ptBalance).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected || !ptBalance}
            onClick={() => setRedeemValue(new Decimal(ptBalance).toFixed(9))}
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
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className="size-6"
            />
            <span className="px-2">{coinConfig?.coinName}</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            disabled
            type="text"
            value={
              redeemValue &&
              new Decimal(redeemValue)
                .div(ratio || 0)
                .toFixed(coinConfig?.decimal ?? 9)
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
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-14 cursor-pointer flex items-center justify-center">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={redeem}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full h-14",
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
