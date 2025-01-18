import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState, useCallback, useEffect } from "react"
import useCoinData from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import { ChevronsDown, Plus, Wallet as WalletIcon } from "lucide-react"
import { useCoinConfig } from "@/queries"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import { LoaderCircle } from "lucide-react"
import {
  getPriceVoucher,
  initPyPosition,
  mintPY,
  splitCoinHelper,
  depositSyCoin,
} from "@/lib/txHelper"
import { useWallet } from "@nemoprotocol/wallet-kit"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import ActionButton from "@/components/ActionButton"
import useMintPYDryRun from "@/hooks/dryrun/useMintPYDryRun"
import { debounce } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function Mint({
  maturity,
  coinType,
}: {
  maturity: string
  coinType: string
}) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [isMinting, setIsMinting] = useState(false)

  const { address, signAndExecuteTransaction } = useWallet()

  const isConnected = useMemo(() => !!address, [address])
  const [mintValue, setMintValue] = useState("")

  const {
    data: coinConfig,
    isLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const decimal = useMemo(() => Number(coinConfig?.decimal) || 0, [coinConfig])

  const { data: coinData, refetch: refetchCoinData } = useCoinData(
    address,
    coinType,
  )
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [coinData, decimal])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(mintValue || 0),
    [coinBalance, mintValue],
  )

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchPyPosition(),
      refetchCoinData(),
    ])
  }, [refetchCoinConfig, refetchPyPosition, refetchCoinData])

  const { mutateAsync: mintDryRun } = useMintPYDryRun(coinConfig)

  const [ptAmount, setPtAmount] = useState("")
  const [ytAmount, setYtAmount] = useState("")

  const [isInputLoading, setIsInputLoading] = useState(false)

  const debouncedGetPyOut = useCallback(
    (value: string, decimal: number) => {
      const getPyOut = debounce(async () => {
        if (value && value !== "0" && decimal && coinData?.length) {
          setIsInputLoading(true)
          try {
            const [result] = await mintDryRun({
              mintValue: value,
              coinData,
              pyPositions: pyPositionData,
            })
            setPtAmount(result.ptAmount)
            setYtAmount(result.ytAmount)
          } catch (error) {
            console.error("Dry run error:", error)
            setPtAmount("")
            setYtAmount("")
          } finally {
            setIsInputLoading(false)
          }
        } else {
          setPtAmount("")
          setYtAmount("")
        }
      }, 500)

      getPyOut()
      return getPyOut.cancel
    },
    [coinData, mintDryRun, pyPositionData],
  )

  useEffect(() => {
    const cancelFn = debouncedGetPyOut(mintValue, decimal)
    return () => {
      cancelFn()
    }
  }, [mintValue, decimal, debouncedGetPyOut])

  const handleInputChange = useCallback((value: string) => {
    setMintValue(value)
  }, [])

  async function mint() {
    if (
      !insufficientBalance &&
      coinConfig &&
      coinType &&
      coinData?.length &&
      address
    ) {
      try {
        setIsMinting(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id)
        }

        const amount = new Decimal(mintValue).mul(10 ** decimal).toString()
        const [splitCoin] = splitCoinHelper(tx, coinData, [amount], coinType)

        const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        mintPY(tx, coinConfig, syCoin, priceVoucher, pyPosition)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(res.digest)
        setOpen(true)
        setMintValue("")
        setStatus("Success")

        await refreshData()
      } catch (error) {
        console.log("tx error", error)
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      } finally {
        setIsMinting(false)
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <TransactionStatusDialog
        open={open}
        status={status}
        network={network}
        txId={txId}
        message={message}
        onClose={() => {
          setTxId("")
          setOpen(false)
        }}
      />

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
            {isLoading ? (
              <LoaderCircle className="animate-spin size-6 text-white/60" />
            ) : (
              <>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className={
                    coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
                  }
                />
                <span className={coinConfig?.coinName && "px-2"}>
                  {coinConfig?.coinName}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              min={0}
              type="number"
              value={mintValue}
              disabled={!isConnected}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.underlyingPrice || 0)
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
      <ChevronsDown className="mx-auto" />
      <div className="flex flex-col w-full gap-y-4.5">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            {isLoading ? (
              <LoaderCircle className="animate-spin size-6 text-white/60" />
            ) : (
              <>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className={
                    coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
                  }
                />
                <span className="px-2">PT {coinConfig?.coinName}</span>
              </>
            )}
          </div>
          <div className="text-right grow">
            {isInputLoading ? (
              <div className="flex justify-end">
                <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
              </div>
            ) : (
              ptAmount &&
              new Decimal(ptAmount).div(10 ** decimal).toFixed(decimal)
            )}
          </div>
        </div>
      </div>
      <Plus className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
          {isLoading ? (
            <LoaderCircle className="animate-spin size-6 text-white/60" />
          ) : (
            <>
              <img
                src={coinConfig?.coinLogo}
                alt={coinConfig?.coinName}
                className={
                  coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
                }
              />
              <span className="px-2">YT {coinConfig?.coinName}</span>
            </>
          )}
        </div>
        <div className="text-right grow">
          {isInputLoading ? (
            <div className="flex justify-end">
              <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
            </div>
          ) : (
            ytAmount &&
            new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal)
          )}
        </div>
      </div>
      <div className="mt-7.5 w-full">
        <ActionButton
          btnText="Mint"
          onClick={mint}
          loading={isMinting}
          disabled={mintValue === ""}
        />
      </div>
    </div>
  )
}
