import Decimal from "decimal.js"
import { useParams } from "react-router-dom"
import { useEffect, useMemo, useState, useCallback } from "react"
import { Transaction } from "@mysten/sui/transactions"
import { ChevronsDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { network } from "@/config"
import { useCoinConfig } from "@/queries"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import {
  initPyPosition,
  redeemSyCoin,
  getPriceVoucher,
  swapExactPtForSy,
  swapExactYtForSy,
  burnSCoin,
} from "@/lib/txHelper"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import AmountInput from "@/components/AmountInput"
import ActionButton from "@/components/ActionButton"
import { formatDecimalValue, isValidAmount } from "@/lib/utils"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useQuerySyOutFromYtInWithVoucher from "@/hooks/useQuerySyOutFromYtInWithVoucher"
import useQuerySyOutFromPtInWithVoucher from "@/hooks/useQuerySyOutFromPtInWithVoucher"
import { debounce } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ContractError } from "@/hooks/types"
import dayjs from "dayjs"
import SlippageSetting from "@/components/SlippageSetting"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"

export default function Sell() {
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState("pt")
  const [redeemValue, setRedeemValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [slippage, setSlippage] = useState("0.5")

  const { address, signAndExecuteTransaction } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [_tokenType])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const decimal = useMemo(() => Number(coinConfig?.decimal), [coinConfig])

  const { mutateAsync: querySyOutFromYt } =
    useQuerySyOutFromYtInWithVoucher(coinConfig)
  const { mutateAsync: querySyOutFromPt } =
    useQuerySyOutFromPtInWithVoucher(coinConfig)

  const debouncedGetSyOut = useCallback(
    (value: string, decimal: number) => {
      const getSyOut = debounce(async () => {
        if (value && value !== "0" && decimal) {
          try {
            const amount = new Decimal(value).mul(10 ** decimal).toString()
            console.log("Input amount:", amount)
            const syOut = await (
              tokenType === "yt" ? querySyOutFromYt : querySyOutFromPt
            )(amount)
            console.log("Raw syOut:", syOut)
            const syAmount = new Decimal(syOut[0]).div(10 ** decimal).toString()
            console.log("Formatted syAmount:", syAmount)
            setTargetValue(syAmount)
            setError(undefined)
          } catch (error) {
            setError((error as ContractError)?.message)
            console.error("Failed to get SY out:", error)
            setTargetValue("")
          }
        } else {
          setTargetValue("")
        }
      }, 500)
      getSyOut()
      return getSyOut.cancel
    },
    [querySyOutFromYt, querySyOutFromPt, tokenType],
  )

  useEffect(() => {
    const cancelFn = debouncedGetSyOut(redeemValue, decimal)
    return () => {
      cancelFn()
    }
  }, [redeemValue, decimal, debouncedGetSyOut])

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [pyPositionData, decimal])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [pyPositionData, decimal])

  const insufficientBalance = useMemo(
    () =>
      tokenType == "pt"
        ? new Decimal(Number(ptBalance)).lt(redeemValue || 0)
        : new Decimal(Number(ytBalance)).lt(redeemValue || 0),
    [ptBalance, ytBalance, redeemValue, tokenType],
  )

  const handleInputChange = (value: string) => {
    setRedeemValue(value)
  }

  const refreshData = useCallback(async () => {
    await Promise.all([refetchCoinConfig(), refetchPyPosition()])
  }, [refetchCoinConfig, refetchPyPosition])

  async function redeem() {
    if (!insufficientBalance && coinConfig && coinType && address) {
      try {
        setIsRedeeming(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const minSyOut = new Decimal(targetValue)
          .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
          .mul(10 ** decimal)
          .toFixed(0)

        const syCoin =
          tokenType === "pt"
            ? swapExactPtForSy(
                tx,
                coinConfig,
                redeemValue,
                pyPosition,
                priceVoucher,
                minSyOut,
              )
            : swapExactYtForSy(
                tx,
                coinConfig,
                redeemValue,
                pyPosition,
                priceVoucher,
                minSyOut,
              )

        const sCoin = redeemSyCoin(tx, coinConfig, syCoin)

        // tx.transferObjects([sCoin], address)

        try {
          // Try to burn sCoin first
          const underlyingCoin = burnSCoin(tx, coinConfig, sCoin)
          tx.transferObjects([underlyingCoin], address)
        } catch (burnError) {
          console.warn("Failed to burn sCoin:", burnError)
          // Fallback: directly transfer sCoin if burn fails
          tx.transferObjects([sCoin], address)
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(res.digest)
        setOpen(true)
        setRedeemValue("")
        setTargetValue("")
        setStatus("Success")

        await refreshData()
      } catch (error) {
        console.log("tx error", error)
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      } finally {
        setIsRedeeming(false)
      }
    }
  }

  const coinName = useMemo(
    () =>
      tokenType === "pt"
        ? `PT ${coinConfig?.coinName}`
        : `YT ${coinConfig?.coinName}`,
    [tokenType, coinConfig],
  )

  const { data: ptYtData } = useCalculatePtYt(coinConfig)

  const price = useMemo(
    () =>
      (tokenType === "pt" ? ptYtData?.ptPrice : ptYtData?.ytPrice)?.toString(),
    [tokenType, ptYtData],
  )

  const { isLoading } = useLoadingState(redeemValue, isConfigLoading)

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <h2 className="text-center text-xl">Sell</h2>
        <div className="flex justify-end w-full">
          <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
        </div>
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
        <AmountInput
          error={error}
          price={price}
          decimal={decimal}
          amount={redeemValue}
          coinName={coinName}
          isLoading={isLoading}
          coinLogo={coinConfig?.coinLogo}
          coinBalance={tokenType === "pt" ? ptBalance : ytBalance}
          isConnected={isConnected}
          isConfigLoading={isConfigLoading}
          onChange={handleInputChange}
          coinNameComponent={
            <Select
              value={tokenType}
              onValueChange={(value) => {
                setTokenType(value)
                setRedeemValue("")
                setTargetValue("")
              }}
            >
              <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base w-fit">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="border-none outline-none bg-[#0E0F16]">
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
          }
        />
        <ChevronsDown className="size-6" />
        <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
          <div className="flex flex-col items-end gap-y-1">
            <div className="flex items-center justify-between w-full h-[28px]">
              <span>Receiving</span>
              <span>
                {!redeemValue ? (
                  "--"
                ) : isLoading ? (
                  <Skeleton className="h-7 w-48 bg-[#2D2D48]" />
                ) : !decimal || !isValidAmount(targetValue) ? (
                  "--"
                ) : (
                  <div className="flex items-center gap-x-1.5">
                    <span>
                      ≈ {formatDecimalValue(new Decimal(targetValue), decimal)}
                    </span>
                    <span>{coinConfig?.coinName}</span>
                    {coinConfig?.coinLogo && (
                      <img
                        src={coinConfig.coinLogo}
                        alt={coinConfig.coinName}
                        className="size-[28px] inline-block align-middle"
                        onError={(e) => {
                          console.error("Logo load error:", e)
                          const img = e.target as HTMLImageElement
                          img.style.display = "none"
                        }}
                      />
                    )}
                  </div>
                )}
              </span>
            </div>
            <div className="text-xs text-white/60">
              {coinConfig?.maturity
                ? dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")
                : "--"}
            </div>
          </div>
        </div>
        <ActionButton
          btnText="Sell"
          onClick={redeem}
          loading={isRedeeming}
          openConnect={openConnect}
          setOpenConnect={setOpenConnect}
          insufficientBalance={insufficientBalance}
          disabled={["", undefined].includes(redeemValue)}
        />
      </div>
    </div>
  )
}
