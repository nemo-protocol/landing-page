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
import dayjs from "dayjs"
import SlippageSetting from "@/components/SlippageSetting"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import useSellPtDryRun from "@/hooks/dryrun/useSellPtDryRun"
import useSellYtDryRun from "@/hooks/dryrun/useSellYtDryRun"
import { ContractError } from "@/hooks/types"
import useMarketStateData from "@/hooks/useMarketStateData"

export default function Sell() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [warning, setWarning] = useState("")
  const [error, setError] = useState<string>()
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState("pt")
  const [redeemValue, setRedeemValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [receivingType, setReceivingType] = useState<"underlying" | "sy">(
    "underlying",
  )

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

  const { mutateAsync: sellPtDryRun } = useSellPtDryRun(coinConfig)
  const { mutateAsync: sellYtDryRun } = useSellYtDryRun(coinConfig)

  const debouncedGetSyOut = useCallback(
    (value: string, decimal: number) => {
      const getSyOut = debounce(async () => {
        if (isValidAmount(value) && decimal && coinConfig?.conversionRate) {
          // TODO: optimize this code to be more efficient
          try {
            const amount = new Decimal(value).mul(10 ** decimal).toString()
            const [syOut] = await (
              tokenType === "yt" ? querySyOutFromYt : querySyOutFromPt
            )(amount)

            const syAmount = new Decimal(syOut)
              .mul(
                receivingType === "underlying" ? coinConfig.conversionRate : 1,
              )
              .toString()
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
    [
      querySyOutFromYt,
      querySyOutFromPt,
      tokenType,
      receivingType,
      coinConfig?.conversionRate,
    ],
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
        .reduce((total, coin) => total.add(coin.ptBalance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [pyPositionData, decimal])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.ytBalance), new Decimal(0))
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
          pyPosition = tx.object(pyPositionData[0].id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const amount = new Decimal(redeemValue).mul(10 ** decimal).toString()

        const [syOut] = await (
          tokenType === "yt" ? querySyOutFromYt : querySyOutFromPt
        )(amount)

        console.log("syOut", syOut)

        const minSyOut = new Decimal(syOut)
          .mul(10 ** decimal)
          .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
          .toFixed(0)

        console.log("minSyOut", minSyOut)

        const syCoin =
          tokenType === "pt"
            ? swapExactPtForSy(
                tx,
                coinConfig,
                redeemValue,
                pyPosition,
                priceVoucher,
              )
            : swapExactYtForSy(
                tx,
                coinConfig,
                redeemValue,
                pyPosition,
                priceVoucher,
                minSyOut,
              )

        // tx.transferObjects([syCoin], address)

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)
        if (receivingType === "underlying") {
          const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
          tx.transferObjects([underlyingCoin], address)
        } else {
          tx.transferObjects([yieldToken], address)
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

  const { data: marketState } = useMarketStateData(coinConfig?.marketStateId)

  const { data: ptYtData } = useCalculatePtYt(coinConfig, marketState)

  const price = useMemo(
    () =>
      (tokenType === "pt" ? ptYtData?.ptPrice : ptYtData?.ytPrice)?.toString(),
    [tokenType, ptYtData],
  )

  const { isLoading } = useInputLoadingState(redeemValue, isConfigLoading)

  const convertReceivingValue = useCallback(
    (value: string, fromType: string, toType: string) => {
      if (!value || !decimal || !coinConfig?.conversionRate) return ""

      const conversionRate = new Decimal(coinConfig.conversionRate)

      if (fromType === "underlying" && toType === "sy") {
        return new Decimal(value).div(conversionRate).toString()
      } else if (fromType === "sy" && toType === "underlying") {
        return new Decimal(value).mul(conversionRate).toString()
      }
      return value
    },
    [decimal, coinConfig],
  )

  const handleSell = async () => {
    const [result] = await (tokenType === "yt"
      ? sellYtDryRun({
          slippage,
          receivingType,
          sellValue: redeemValue,
          pyPositions: pyPositionData,
        })
      : sellPtDryRun({
          sellValue: redeemValue,
          receivingType,
          pyPositions: pyPositionData,
        }))
    console.log("result", result)
  }

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <h2 className="text-center text-xl" onClick={handleSell}>
          Sell
        </h2>
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
          warning={warning}
          setWarning={setWarning}
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
                {isLoading ? (
                  <Skeleton className="h-7 w-48 bg-[#2D2D48]" />
                ) : !decimal || !isValidAmount(targetValue) ? (
                  "--"
                ) : (
                  <div className="flex items-center gap-x-1.5">
                    <span>
                      ≈ {formatDecimalValue(new Decimal(targetValue), decimal)}
                    </span>
                    <Select
                      value={receivingType}
                      onValueChange={(value) => {
                        const newTargetValue = convertReceivingValue(
                          targetValue,
                          receivingType,
                          value,
                        )
                        setReceivingType(value as "underlying" | "sy")
                        setTargetValue(newTargetValue)
                      }}
                    >
                      <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base w-fit">
                        <SelectValue>
                          <div className="flex items-center gap-x-1">
                            <span>
                              {receivingType === "underlying"
                                ? coinConfig?.underlyingCoinName
                                : coinConfig?.coinName}
                            </span>
                            {(receivingType === "underlying"
                              ? coinConfig?.underlyingCoinLogo
                              : coinConfig?.coinLogo) && (
                              <img
                                src={
                                  receivingType === "underlying"
                                    ? coinConfig?.underlyingCoinLogo
                                    : coinConfig?.coinLogo
                                }
                                alt={
                                  receivingType === "underlying"
                                    ? coinConfig?.underlyingCoinName
                                    : coinConfig?.coinName
                                }
                                className="size-5"
                              />
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-none outline-none bg-[#0E0F16]">
                        <SelectGroup>
                          <SelectItem
                            value="underlying"
                            className="cursor-pointer text-white"
                          >
                            <div className="flex items-center gap-x-1">
                              <span>{coinConfig?.underlyingCoinName}</span>
                              {coinConfig?.underlyingCoinLogo && (
                                <img
                                  src={coinConfig.underlyingCoinLogo}
                                  alt={coinConfig.underlyingCoinName}
                                  className="size-5"
                                />
                              )}
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="sy"
                            className="cursor-pointer text-white"
                          >
                            <div className="flex items-center gap-x-1">
                              <span>{coinConfig?.coinName}</span>
                              {coinConfig?.coinLogo && (
                                <img
                                  src={coinConfig.coinLogo}
                                  alt={coinConfig.coinName}
                                  className="size-5"
                                />
                              )}
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
          disabled={["", undefined].includes(redeemValue)}
        />
      </div>
    </div>
  )
}
