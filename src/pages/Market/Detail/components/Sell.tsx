import Decimal from "decimal.js"
import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useState, useCallback } from "react"
import { Transaction } from "@mysten/sui/transactions"
import { ChevronsDown, Info } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IS_DEV, network } from "@/config"
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
import AmountInput from "@/components/AmountInput"
import ActionButton from "@/components/ActionButton"
import { formatDecimalValue, isValidAmount, safeDivide } from "@/lib/utils"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useQuerySyOutByYtInDryRun from "@/hooks/dryRun/sy/useQuerySyOutByYtIn"
import { debounce } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import SlippageSetting from "@/components/SlippageSetting"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import useSellPtDryRun from "@/hooks/dryRun/useSellPtDryRun"
// import useSellYtDryRun from "@/hooks/dryrun/useSellYtDryRun"
import { ContractError } from "@/hooks/types"
import useMarketStateData from "@/hooks/useMarketStateData"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { showTransactionDialog } from "@/lib/dialog"
import {
  NEED_MIN_VALUE_LIST,
  UNSUPPORTED_UNDERLYING_COINS,
} from "@/lib/constants"

export default function Sell() {
  const [warning, setWarning] = useState("")
  const [error, setError] = useState<string>()
  const [slippage, setSlippage] = useState("0.5")
  const [tokenType, setTokenType] = useState("pt")
  const [redeemValue, setRedeemValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string>()
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [receivingType, setReceivingType] = useState<"underlying" | "sy">(
    "underlying",
  )

  const [minValue, setMinValue] = useState(0)

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

  const { mutateAsync: querySyOutByYtIn } = useQuerySyOutByYtInDryRun({
    outerCoinConfig: coinConfig,
  })

  useEffect(() => {
    if (coinConfig) {
      const minValue = NEED_MIN_VALUE_LIST.find(
        (item) => item.coinType === coinConfig.coinType,
      )?.minValue
      if (minValue) {
        setMinValue(minValue)
      }
    }
  }, [coinConfig])

  const { mutateAsync: sellPtDryRun } = useSellPtDryRun(coinConfig)
  // const { mutateAsync: sellYtDryRun } = useSellYtDryRun(coinConfig)

  const debouncedGetSyOut = useCallback(
    (value: string, decimal: number) => {
      const getSyOut = debounce(async () => {
        if (isValidAmount(value) && decimal && coinConfig?.conversionRate) {
          // TODO: optimize this code to be more efficient

          try {
            const inputAmount = new Decimal(value).mul(10 ** decimal).toString()
            const { outputValue } =
              tokenType === "yt"
                ? await querySyOutByYtIn({
                    ytAmount: inputAmount,
                  }).then(({ syValue }) => ({
                    outputValue: syValue,
                  }))
                : await sellPtDryRun({
                    minSyOut: "0",
                    receivingType: "sy",
                    ptAmount: inputAmount,
                    pyPositions: pyPositionData,
                  })

            const targetValue = new Decimal(outputValue)
              .mul(
                receivingType === "underlying" ? coinConfig.conversionRate : 1,
              )
              .toFixed(decimal)

            if (
              new Decimal(targetValue).lt(minValue) &&
              receivingType === "underlying"
            ) {
              setError(
                `Please enter at least ${formatDecimalValue(
                  new Decimal(value).mul(minValue).div(targetValue),
                  decimal,
                )} ${tokenType.toUpperCase()} ${coinConfig.coinName}`,
              )
            } else {
              setError(undefined)
            }

            setTargetValue(targetValue)
          } catch (errorMsg) {
            // TODO:  use other calc hook when not connect
            const { error, detail } = parseErrorMessage(
              (errorMsg as ContractError)?.message,
            )
            setError(error)
            setErrorDetail(detail)
            setTargetValue("")
          }
        } else {
          setTargetValue("")
          setError(undefined)
          setErrorDetail(undefined)
        }
      }, 500)
      getSyOut()
      return getSyOut.cancel
    },
    [
      coinConfig?.conversionRate,
      coinConfig?.coinName,
      receivingType,
      minValue,
      tokenType,
      querySyOutByYtIn,
      sellPtDryRun,
      pyPositionData,
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

        const inputAmount = new Decimal(redeemValue)
          .mul(10 ** decimal)
          .toString()

        // 计算预期输出
        const { syAmount } = await (tokenType === "yt"
          ? querySyOutByYtIn({ ytAmount: inputAmount })
          : sellPtDryRun({
              minSyOut: "0",
              receivingType,
              ptAmount: inputAmount,
              pyPositions: pyPositionData,
            }))

        console.log("swap_exact_pt_for_sy", "syAmount", syAmount)

        // 计算最小输出（考虑滑点）
        const minSyOut = new Decimal(syAmount)
          .mul(new Decimal(1).sub(new Decimal(slippage).div(100)))
          .toFixed(0)

        console.log("swap_exact_pt_for_sy", "minSyOut", minSyOut)

        const syCoin =
          tokenType === "pt"
            ? swapExactPtForSy(
                tx,
                coinConfig,
                inputAmount,
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

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)
        if (
          receivingType === "underlying" &&
          !UNSUPPORTED_UNDERLYING_COINS.includes(coinConfig?.coinType)
        ) {
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

        showTransactionDialog({
          status: "Success",
          network,
          txId: res.digest,
          onClose: async () => {
            await refreshData()
            await refreshPtYt()
          },
        })

        setRedeemValue("")
        setTargetValue("")
      } catch (errorMsg) {
        console.log("tx error", errorMsg)
        const { error, detail } = parseErrorMessage(
          (errorMsg as Error)?.message ?? "",
        )
        setErrorDetail(detail)
        showTransactionDialog({
          status: "Failed",
          network,
          txId: "",
          message: error,
        })
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

  const { data: ptYtData, refresh: refreshPtYt } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

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

  const btnDisabled = useMemo(() => {
    return ["", undefined].includes(redeemValue) || !!error
  }, [redeemValue, error])

  const priceImpact = useMemo(() => {
    if (
      !targetValue ||
      !redeemValue ||
      !ptYtData?.ptPrice ||
      !coinConfig?.coinPrice ||
      !coinConfig?.underlyingPrice
    ) {
      return
    }

    const inputValue = new Decimal(redeemValue).mul(
      tokenType === "pt" ? ptYtData.ptPrice : ptYtData.ytPrice,
    )

    const outputValue = new Decimal(targetValue).mul(
      receivingType === "underlying"
        ? (coinConfig.underlyingPrice ?? "0")
        : (coinConfig.coinPrice ?? "0"),
    )

    const value = outputValue
    const ratio = safeDivide(
      inputValue.minus(outputValue),
      inputValue,
      "decimal",
    ).mul(100)

    return { value, ratio }
  }, [
    tokenType,
    targetValue,
    redeemValue,
    receivingType,
    ptYtData?.ptPrice,
    ptYtData?.ytPrice,
    coinConfig?.coinPrice,
    coinConfig?.underlyingPrice,
  ])

  return (
    <div className="w-full bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-3 sm:gap-y-4">
        <div className="w-full relative">
          {IS_DEV && (
            <Link
              to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/swap/${tokenType === "pt" ? "pt" : "yt"}`}
              className="text-sm text-white/60 hover:text-white underline transition-colors absolute left-0 top-1/2 -translate-y-1/2"
            >
              Swap {tokenType === "pt" ? "PT" : "YT"}
            </Link>
          )}
          <h2 className="text-base sm:text-xl text-center">Sell</h2>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
          </div>
        </div>
        <AmountInput
          error={error}
          price={price}
          decimal={decimal}
          warning={warning}
          coinName={coinName}
          amount={redeemValue}
          isLoading={isLoading}
          setWarning={setWarning}
          isConnected={isConnected}
          errorDetail={errorDetail}
          onChange={handleInputChange}
          maturity={coinConfig?.maturity}
          coinLogo={coinConfig?.coinLogo}
          isConfigLoading={isConfigLoading}
          coinBalance={tokenType === "pt" ? ptBalance : ytBalance}
          coinNameComponent={
            <Select
              value={tokenType}
              onValueChange={(value) => {
                setTokenType(value)
                setRedeemValue("")
                setTargetValue("")
              }}
            >
              <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit">
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
        <ChevronsDown className="size-5 sm:size-6" />
        <div className="rounded-lg sm:rounded-xl border border-[#2D2D48] px-3 sm:px-4 py-4 sm:py-6 w-full text-xs sm:text-sm">
          <div className="flex flex-col items-end gap-y-0.5 sm:gap-y-1">
            <div className="flex items-center justify-between w-full h-[24px] sm:h-[28px]">
              <span>Receiving</span>
              <span>
                {isLoading ? (
                  <Skeleton className="h-6 sm:h-7 w-36 sm:w-48 bg-[#2D2D48]" />
                ) : (
                  <div className="flex items-center gap-x-1 sm:gap-x-1.5">
                    <span>
                      {isValidAmount(targetValue)
                        ? ` ≈ ${formatDecimalValue(targetValue, decimal)}`
                        : ""}
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
                      <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit">
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
                                className="size-4 sm:size-5"
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
                                  className="size-4 sm:size-5"
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
                                  className="size-4 sm:size-5"
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
            {isLoading ? (
              <div className="text-[10px] sm:text-xs">
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 bg-[#2D2D48]" />
              </div>
            ) : priceImpact ? (
              <div className="flex items-center gap-x-1 text-[10px] sm:text-xs">
                {priceImpact.ratio.gt(5) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info
                          className={`size-2.5 sm:size-3 cursor-pointer ${
                            priceImpact.ratio.gt(15)
                              ? "text-red-500"
                              : priceImpact.ratio.gt(5)
                                ? "text-yellow-500"
                                : "text-white/60"
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#12121B] max-w-[280px] sm:max-w-[500px] text-xs sm:text-sm">
                        <p>
                          Price Impact Alert: Price impact is too high. Please
                          consider adjusting the transaction size.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <span
                  className={`text-[10px] sm:text-xs ${
                    priceImpact.ratio.gt(15)
                      ? "text-red-500"
                      : priceImpact.ratio.gt(5)
                        ? "text-yellow-500"
                        : "text-white/60"
                  }`}
                >
                  ${formatDecimalValue(priceImpact.value, 4)}
                </span>
                <span
                  className={`text-[10px] sm:text-xs ${
                    priceImpact.ratio.gt(15)
                      ? "text-red-500"
                      : priceImpact.ratio.gt(5)
                        ? "text-yellow-500"
                        : "text-white/60"
                  }`}
                >
                  ({formatDecimalValue(priceImpact.ratio, 4)}%)
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <ActionButton
          btnText="Sell"
          onClick={redeem}
          loading={isRedeeming}
          disabled={btnDisabled}
        />
      </div>
    </div>
  )
}
