import Decimal from "decimal.js"
import { network } from "@/config"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
// import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import AddIcon from "@/assets/images/svg/add.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import { useCoinConfig, useQueryMintPYRatio } from "@/queries"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import { initPyPosition } from "@/lib/txHelper"
import { ConnectModal, useWallet } from "@suiet/wallet-kit"

export default function Mint({ slippage }: { slippage: string }) {
  const { coinType, maturity } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [currentWallet, setCurrentWallet] = useState<any>([])

  // const { currentWallet, isConnected } = useCurrentWallet()
  const { getAccounts, connected: isConnected, signAndExecuteTransaction } = useWallet()

  const [mintValue, setMintValue] = useState("")
  const [openConnect, setOpenConnect] = useState(false)

  // const { mutateAsync: signAndExecuteTransaction } =
  //   useCustomSignAndExecuteTransaction()

  useEffect(() => {
    if (isConnected) {
      setCurrentWallet(getAccounts())
    }
  }, [isConnected])

  const address = useMemo(
    () => currentWallet.length != 0 && currentWallet?.accounts[0].address,
    [isConnected],
  )

  const { data: coinConfig } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: coinData } = useCoinData(address, coinType)
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(coinConfig?.decimal ?? 0)
    }
    return 0
  }, [coinData, coinConfig])

  const { data: mintPYRatio } = useQueryMintPYRatio(coinConfig?.marketStateId)
  const ptRatio = useMemo(() => mintPYRatio?.syPtRate ?? 1, [mintPYRatio])
  const ytRatio = useMemo(() => mintPYRatio?.syYtRate ?? 1, [mintPYRatio])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(mintValue || 0),
    [coinBalance, mintValue],
  )

  async function mint() {
    if (!insufficientBalance && coinConfig && coinType && address) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [splitCoin] = tx.splitCoins(coinData![0].coinObjectId, [
          new Decimal(mintValue).mul(10 ** coinConfig.decimal).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(mintValue)
                .mul(10 ** coinConfig.decimal)
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toNumber(),
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

        tx.moveCall({
          target: `${coinConfig.nemoContractId}::yield_factory::mint_py`,
          arguments: [
            tx.object(coinConfig.version),
            syCoin,
            priceVoucher,
            pyPosition,
            tx.object(coinConfig.pyStateId),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: Transaction.from(tx),
          // chain: `sui:${network}`,
        })
        //TODO: Add error handling
        // if (res.effects?.status.status === "failure") {
        //   setOpen(true)
        //   setStatus("Failed")
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
        setTxId(res.digest)
        setOpen(true)
        setMintValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  // const debouncedSetMintValue = debounce((value: string) => {
  //   setMintValue(value)
  // }, 300)

  return (
    <div className="flex flex-col items-center">
      {/* TODO: Add AlertDialog component */}
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

      {/* TODO: Add animation */}
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
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className="size-6"
            />
            <span className="px-2">{coinConfig?.coinName}</span>
            {/* <DownArrowIcon /> */}
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              type="text"
              value={mintValue}
              disabled={!isConnected}
              onChange={
                (e) => setMintValue(e.target.value)
                // debouncedSetMintValue(new Decimal(e.target.value).toString())
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
      <div className="flex flex-col w-full gap-y-4.5">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className="size-6"
            />
            <span className="px-2">PT {coinConfig?.coinName}</span>
            {/* <DownArrowIcon /> */}
          </div>
          <input
            disabled
            type="text"
            value={
              mintValue &&
              new Decimal(mintValue).div(ptRatio).toFixed(coinConfig?.decimal)
            }
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      <AddIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
          <img
            src={coinConfig?.coinLogo}
            alt={coinConfig?.coinName}
            className="size-6"
          />
          <span className="px-2">YT {coinConfig?.coinName}</span>
          {/* <DownArrowIcon /> */}
        </div>
        <input
          disabled
          type="text"
          value={
            mintValue &&
            new Decimal(mintValue).div(ytRatio).toFixed(coinConfig?.decimal)
          }
          className="bg-transparent h-full outline-none grow text-right min-w-0"
        />
      </div>
      {!isConnected ? (
        <ConnectModal
          open={openConnect}
          onOpenChange={(isOpen) => setOpenConnect(isOpen)}
        // trigger={
        //   <button className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-14 cursor-pointer">
        //     Connect Wallet
        //   </button>
        // }
        >
          <button className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-14 cursor-pointer">
            Connect Wallet
          </button>
        </ConnectModal>

      ) : insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-14 cursor-pointer flex items-center justify-center">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={mint}
          disabled={mintValue === ""}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full h-14",
            mintValue === ""
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Mint
        </button>
      )}
    </div>
  )
}
