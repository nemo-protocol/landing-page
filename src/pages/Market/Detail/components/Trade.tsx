import Decimal from "decimal.js"
import { debugLog, network } from "@/config"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { ChevronsDown, Info } from "lucide-react"
import { Transaction } from "@mysten/sui/transactions"
import { useCoinConfig } from "@/queries"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCoinData from "@/hooks/query/useCoinData"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage, parseGasErrorMessage } from "@/lib/errorMapping"
import {
  formatDecimalValue,
  isValidAmount,
  debounce,
  safeDivide,
} from "@/lib/utils"
import { depositSyCoin, initPyPosition, splitCoinHelper } from "@/lib/txHelper"
import { mintSCoin } from "@/lib/txHelper/coin"
import ActionButton from "@/components/ActionButton"
import AmountInput from "@/components/AmountInput"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useGetApproxYtOutDryRun from "@/hooks/dryRun/useGetApproxYtOutDryRun"
import TradeInfo from "@/components/TradeInfo"
import { Skeleton } from "@/components/ui/skeleton"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"
import useTradeRatio from "@/hooks/actions/useTradeRatio"
import useQueryYtOutBySyInWithVoucher from "@/hooks/useQueryYtOutBySyInWithVoucher"
import useMarketStateData from "@/hooks/useMarketStateData"
import { CoinConfig } from "@/queries/types/market"
import dayjs from "dayjs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatLargeNumber } from "@/lib/utils"
import { showTransactionDialog } from "@/lib/dialog"
import { NEED_MIN_VALUE_LIST } from "@/lib/constants"
import useGetConversionRateDryRun from "@/hooks/dryRun/useGetConversionRateDryRun"
import { getPriceVoucher } from "@/lib/txHelper/price"

export default function Trade() {
  const [warning, setWarning] = useState("")
  const { coinType, maturity } = useParams()
  const [error, setError] = useState<string>()
  const [initRatio, setInitRatio] = useState<string>("")
  const [ytRatio, setYtRatio] = useState<string>("")
  const [swapValue, setSwapValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [ytValue, setYtValue] = useState<string>()
  const [ytFeeValue, setYtFeeValue] = useState<string>()
  const [isSwapping, setIsSwapping] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string>()
  const [tokenType, setTokenType] = useState<number>(0) // 0-native coin, 1-wrapped coin
  const [isCalcYtLoading, setIsCalcYtLoading] = useState(false)
  const [isInitRatioLoading, setIsInitRatioLoading] = useState(false)

  const { address, signAndExecuteTransaction } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  const [minValue, setMinValue] = useState(0)

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

  const coinName = useMemo(
    () =>
      tokenType === 0 ? coinConfig?.underlyingCoinName : coinConfig?.coinName,
    [tokenType, coinConfig],
  )

  const coinLogo = useMemo(
    () =>
      tokenType === 0 ? coinConfig?.underlyingCoinLogo : coinConfig?.coinLogo,
    [tokenType, coinConfig],
  )

  const price = useMemo(
    () =>
      (tokenType === 0
        ? coinConfig?.underlyingPrice
        : coinConfig?.coinPrice
      )?.toString(),
    [tokenType, coinConfig],
  )

  const decimal = useMemo(() => Number(coinConfig?.decimal), [coinConfig])

  const { data: marketStateData } = useMarketStateData(
    coinConfig?.marketStateId,
  )

  const conversionRate = useMemo(() => coinConfig?.conversionRate, [coinConfig])

  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const { isLoading } = useInputLoadingState(swapValue, isConfigLoading)

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isConfigLoading || isCalcYtLoading || isInitRatioLoading,
  )

  const {
    data: coinData,
    isLoading: isBalanceLoading,
    refetch: refetchCoinData,
  } = useCoinData(
    address,
    tokenType === 0 ? coinConfig?.underlyingCoinType : coinType,
  )

  const coinBalance = useMemo(() => {
    if (coinData && coinData?.length && decimal) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [coinData, decimal])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(swapValue || 0),
    [coinBalance, swapValue],
  )

  const { mutateAsync: calculateRatio } = useTradeRatio(coinConfig)
  const { mutateAsync: queryYtOut } = useQueryYtOutBySyInWithVoucher(coinConfig)
  const getApproxYtOutDryRun = useGetApproxYtOutDryRun(coinConfig)

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchPyPosition(),
      refetchCoinData(),
    ])
  }, [refetchCoinConfig, refetchPyPosition, refetchCoinData])

  useEffect(() => {
    async function initRatio() {
      if (conversionRate) {
        try {
          setIsInitRatioLoading(true)
          const initialRatio = await calculateRatio(
            tokenType === 0 ? conversionRate : "1",
          )
          setInitRatio(initialRatio)
        } catch (error) {
          console.error("Failed to calculate initial ratio:", error)
        } finally {
          setIsInitRatioLoading(false)
        }
      }
    }
    initRatio()
  }, [calculateRatio, conversionRate, tokenType])

  const debouncedGetYtOut = useCallback(
    (value: string, decimal: number, config?: CoinConfig) => {
      const getYtOut = debounce(async () => {
        if (tokenType === 0 && value && new Decimal(value).lt(minValue)) {
          setError(
            `Please enter at least ${minValue} ${coinConfig?.underlyingCoinName}`,
          )
          return
        }
        if (value && decimal && config && conversionRate) {
          setIsCalcYtLoading(true)
          try {
            setError(undefined)
            const swapAmount = new Decimal(value)
              .div(tokenType === 0 ? conversionRate : 1)
              .mul(10 ** decimal)
              .toFixed(0)
            const { ytValue, feeValue } = await queryYtOut(swapAmount)

            setYtValue(ytValue)
            setYtFeeValue(feeValue)
            const ytRatio = safeDivide(ytValue, value, "string")
            setYtRatio(ytRatio)
          } catch (error) {
            const { error: msg, detail } = parseErrorMessage(
              (error as Error)?.message ?? "",
            )
            setError(msg)
            setErrorDetail(detail)
            setYtValue(undefined)
            setYtFeeValue(undefined)
            setYtRatio(initRatio)
          } finally {
            setIsCalcYtLoading(false)
          }
        } else {
          setYtValue(undefined)
          setYtFeeValue(undefined)
          setYtRatio(initRatio)
          setError(undefined)
        }
      }, 500)
      getYtOut()
      return getYtOut.cancel
    },
    [
      tokenType,
      minValue,
      conversionRate,
      coinConfig?.underlyingCoinName,
      queryYtOut,
      initRatio,
    ],
  )

  useEffect(() => {
    const cancelFn = debouncedGetYtOut(swapValue, decimal ?? 0, coinConfig)
    return () => {
      cancelFn()
    }
  }, [swapValue, decimal, coinConfig, debouncedGetYtOut])

  const { data: ptYtData, refetch: refetchPtYt } = useCalculatePtYt(
    coinConfig,
    marketStateData,
  )

  const hasLiquidity = useMemo(() => {
    return isValidAmount(marketStateData?.lpSupply)
  }, [marketStateData])

  const btnDisabled = useMemo(() => {
    return (
      !hasLiquidity ||
      insufficientBalance ||
      !isValidAmount(swapValue) ||
      !!error
    )
  }, [swapValue, insufficientBalance, hasLiquidity, error])

  const btnText = useMemo(() => {
    if (!hasLiquidity) {
      return "No liquidity available"
    }
    if (insufficientBalance) {
      return `Insufficient ${coinName} balance`
    }
    if (swapValue === "") {
      return "Please enter an amount"
    }
    return "Buy"
  }, [hasLiquidity, insufficientBalance, swapValue, coinName])

  const priceImpact = useMemo(() => {
    if (
      !ytValue ||
      !decimal ||
      !swapValue ||
      !ptYtData?.ytPrice ||
      !coinConfig?.coinPrice ||
      !coinConfig?.underlyingPrice
    ) {
      return
    }

    const outputValue = new Decimal(ytValue).mul(ptYtData.ytPrice)

    const value = outputValue
    console.log("ytRatio", ytRatio, initRatio)
    const ratio = new Decimal(ytRatio).minus(initRatio).mul(100)

    return { value, ratio }
  }, [
    ytValue,
    decimal,
    ytRatio,
    swapValue,
    initRatio,
    ptYtData?.ytPrice,
    coinConfig?.coinPrice,
    coinConfig?.underlyingPrice,
  ])

  async function swap() {
    if (
      coinType &&
      address &&
      swapValue &&
      coinConfig &&
      conversionRate &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        setIsSwapping(true)
        const tx = new Transaction()

        const conversionRate = await getConversionRate(coinConfig)

        const swapAmount = new Decimal(swapValue).mul(10 ** decimal).toFixed(0)

        const syAmount = new Decimal(swapAmount)
          .div(tokenType === 0 ? conversionRate : 1)
          .toFixed(0)

        const { ytValue } = await queryYtOut(syAmount)

        const minYtOut = new Decimal(ytValue)
          .mul(10 ** decimal)
          .mul(1 - new Decimal(slippage).div(100).toNumber())
          .toFixed(0)

        const [splitCoin] =
          tokenType === 0
            ? [
                await mintSCoin({
                  tx,
                  address,
                  coinData,
                  coinConfig,
                  amount: swapAmount,
                }),
              ]
            : splitCoinHelper(tx, coinData, [swapAmount], coinType)

        const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const { approxYtOut, netSyTokenization } =
          await getApproxYtOutDryRun.mutateAsync({
            netSyIn: syAmount,
            minYtOut,
          })

        console.log(
          "approxYtOut, netSyTokenization",
          approxYtOut,
          netSyTokenization,
        )

        tx.moveCall({
          target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_yt`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(minYtOut),
            tx.pure.u64(approxYtOut),
            tx.pure.u64(netSyTokenization),
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

        debugLog("swap_sy_for_exact_yt move call:", {
          target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_yt`,
          arguments: [
            coinConfig.version,
            minYtOut,
            approxYtOut,
            netSyTokenization,
            "syCoin",
            "priceVoucher",
            "pyPosition",
            coinConfig.pyStateId,
            coinConfig.yieldFactoryConfigId,
            coinConfig.marketFactoryConfigId,
            coinConfig.marketStateId,
            "0x6",
          ],
          typeArguments: [coinConfig.syCoinType],
        })

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
            await refetchPtYt()
          },
        })

        setSwapValue("")
      } catch (errorMsg) {
        const msg = (errorMsg as Error)?.message ?? error
        const gasMsg = parseGasErrorMessage(msg)
        if (gasMsg) {
          showTransactionDialog({
            status: "Failed",
            network,
            txId: "",
            message: gasMsg,
          })
        } else if (
          msg.includes(
            "Transaction failed with the following error. Dry run failed, could not automatically determine a budget: InsufficientGas in command 5",
          )
        ) {
          showTransactionDialog({
            status: "Failed",
            network,
            txId: "",
            message: "Insufficient YT in the pool.",
          })
        } else {
          const { error, detail } = parseErrorMessage(msg || "")
          setErrorDetail(detail)
          showTransactionDialog({
            status: "Failed",
            network,
            txId: "",
            message: error,
          })
        }
      } finally {
        setIsSwapping(false)
      }
    }
  }

  return (
    <div className="w-full md:w-[650px] lg:w-full flex flex-col lg:flex-row gap-5">
      <div className="lg:w-[500px] bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07] shrink-0">
        <div className="flex flex-col items-center gap-y-3 sm:gap-y-4">
          <h2 className="text-center text-base sm:text-xl">Trade</h2>
          <AmountInput
            price={price}
            error={error}
            warning={warning}
            decimal={decimal}
            amount={swapValue}
            coinName={coinName}
            coinLogo={coinLogo}
            isLoading={isLoading}
            setWarning={setWarning}
            disabled={!hasLiquidity}
            errorDetail={errorDetail}
            coinBalance={coinBalance}
            isConnected={isConnected}
            maturity={coinConfig?.maturity}
            isConfigLoading={isConfigLoading}
            isBalanceLoading={isBalanceLoading}
            onChange={(value) => setSwapValue(value)}
            coinNameComponent={
              <Select
                value={tokenType.toString()}
                onValueChange={(value) => {
                  setWarning("")
                  setError(undefined)
                  setSwapValue("")
                  setTokenType(Number(value))
                }}
              >
                <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit max-w-44 text-left">
                  <SelectValue placeholder="Select token type" />
                </SelectTrigger>
                <SelectContent className="border-none outline-none bg-[#0E0F16]">
                  <SelectGroup>
                    <SelectItem
                      value={"0"}
                      className="cursor-pointer text-white"
                    >
                      {coinConfig?.underlyingCoinName}
                    </SelectItem>
                    <SelectItem
                      value={"1"}
                      className="cursor-pointer text-white"
                    >
                      {coinConfig?.coinName}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
          />
          <ChevronsDown className="size-5 sm:size-6" />
          <div className="rounded-lg sm:rounded-xl border border-[#2D2D48] px-3 sm:px-4 py-4 sm:py-6 w-full text-xs sm:text-sm">
            <div className="flex flex-col items-end gap-y-1">
              <div className="flex items-center justify-between w-full">
                <span>Receiving</span>
                <div className="flex items-start gap-x-2">
                  <div className="flex flex-col items-end">
                    {isCalcYtLoading ? (
                      <Skeleton className="h-4 w-32 bg-[#2D2D48]" />
                    ) : (
                      ytValue && (
                        <div className="flex items-center gap-x-1">
                          <span>≈</span>
                          <span>{formatDecimalValue(ytValue, decimal)}</span>
                        </div>
                      )
                    )}
                    {isCalcYtLoading ? (
                      <Skeleton className="h-3 w-24 bg-[#2D2D48] mt-1" />
                    ) : (
                      priceImpact && (
                        <div className="flex items-center gap-x-1 text-xs">
                          {priceImpact.ratio.gt(15) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info
                                    className={`size-3 cursor-pointer ${
                                      priceImpact.ratio.gt(30)
                                        ? "text-red-500"
                                        : priceImpact.ratio.gt(15)
                                          ? "text-yellow-500"
                                          : "text-white/60"
                                    }`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#12121B] max-w-[500px]">
                                  <p>
                                    Price Impact Alert: Price impact is too
                                    high. Please consider adjusting the
                                    transaction size.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <span
                            className={`text-xs ${
                              priceImpact.ratio.gt(30)
                                ? "text-red-500"
                                : priceImpact.ratio.gt(15)
                                  ? "text-yellow-500"
                                  : "text-white/60"
                            }`}
                          >
                            ${formatDecimalValue(priceImpact.value, 4)}
                          </span>
                          <span
                            className={`text-xs ${
                              priceImpact.ratio.gt(30)
                                ? "text-red-500"
                                : priceImpact.ratio.gt(15)
                                  ? "text-yellow-500"
                                  : "text-white/60"
                            }`}
                          >
                            ({formatDecimalValue(priceImpact.ratio, 2)}%)
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span>YT {coinConfig?.coinName}</span>
                    <span className="text-white/60 text-xs">
                      {dayjs(
                        parseInt(coinConfig?.maturity || Date.now().toString()),
                      ).format("DD MMM YYYY")}
                    </span>
                  </div>
                  <img
                    src={coinConfig?.coinLogo}
                    alt={coinConfig?.coinName}
                    className="size-10"
                  />
                </div>
              </div>
            </div>
            <hr className="border-t border-[#2D2D48] mt-6" />
            <div className="flex items-center justify-between mt-6">
              <span>Leveraged Yield APY</span>
              <span className="underline">
                {ptYtData?.ytApy
                  ? `${formatLargeNumber(ptYtData.ytApy, 6)} %`
                  : "--"}
              </span>
            </div>
          </div>
          <TradeInfo
            coinName={coinName}
            slippage={slippage}
            isLoading={isLoading}
            setSlippage={setSlippage}
            ratio={ytRatio}
            onRefresh={async () => {
              if (conversionRate) {
                try {
                  setIsCalcYtLoading(true)
                  const newRatio = await calculateRatio(
                    tokenType === 0 ? conversionRate : "1",
                  )
                  setInitRatio(newRatio)
                } catch (error) {
                  console.error("Failed to refresh ratio:", error)
                  setInitRatio("")
                } finally {
                  setIsCalcYtLoading(false)
                }
              }
            }}
            isRatioLoading={isRatioLoading}
            tradeFee={ytFeeValue}
            targetCoinName={`YT ${coinConfig?.coinName}`}
          />
          <ActionButton
            onClick={swap}
            btnText={btnText}
            loading={isSwapping}
            disabled={btnDisabled}
          />
        </div>
      </div>
      <div className="grow space-y-5 bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07] @container">
        <h3>HOW YT WORKS</h3>
        <div className="border border-[#2D2D48] px-[29px] py-[35px] flex items-center gap-4 rounded-xl flex-col @[630px]:flex-row">
          <div className="flex items-start gap-x-4 shrink-0">
            <div className="flex flex-col items-center space-y-4">
              <div
                className="bg-no-repeat size-8 lg:size-14 bg-cover flex items-center justify-center"
                style={{ backgroundImage: "url(/images/market/coin-bg.png)" }}
              >
                <img
                  src="/images/market/yt.png"
                  alt="yt"
                  className="size-12 lg:size-[28px]"
                />
              </div>
              <span className="text-xs text-white/80">1 YT</span>
            </div>

            <div className="flex flex-col items-center">
              <span>Yields</span>
              <img src="/images/market/left-arrow.svg" alt="" />
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div
                className="bg-no-repeat size-8 lg:size-14 bg-cover flex items-center justify-center"
                style={{ backgroundImage: "url(/images/market/coin-bg.png)" }}
              >
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-12 lg:size-[28px]"
                />
              </div>
              <span className="text-xs text-white/80 text-center">
                1 {coinConfig?.underlyingCoinName} in{" "}
                {coinConfig?.underlyingProtocol}
              </span>
            </div>
          </div>

          <div className="w-full @[630px]:w-auto flex justify-center">
            <svg
              width="2"
              height="93"
              viewBox="0 0 2 93"
              className="hidden @[630px]:block"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 3.05176e-05L0.999996 93"
                stroke="#3A3A60"
                strokeDasharray="2 2"
              />
            </svg>

            <svg
              width="350"
              height="2"
              viewBox="0 0 350 2"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="block @[630px]:hidden"
            >
              <path
                d="M0 1L350 0.999996"
                stroke="#3A3A60"
                strokeDasharray="2 2"
              />
            </svg>
          </div>

          <div className="text-center text-white/80 text-xs">
            Holding YT = Accruing yield from underlying asset.
          </div>
        </div>

        <img src="/images/market/yt_desc.png" alt="yt" className="w-full" />
        <div className="border border-[#2D2D48] grid grid-cols-3 rounded-xl">
          <div className="flex flex-col-reverse sm:flex-col items-start py-4 px-2.5 gap-2.5">
            <div className="text-white/60 text-xs h-12 sm:h-auto">
              Underlying Protocol
            </div>
            <div className="flex items-center gap-x-1">
              <img
                className="size-3.5"
                src={coinConfig?.underlyingProtocolLogo}
                alt={coinConfig?.underlyingProtocol}
              />
              <div className="text-xs">{coinConfig?.underlyingProtocol}</div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-col items-start py-4 px-2.5 gap-2.5">
            <div className="text-white/60 text-xs h-12 sm:h-auto">
              Underlying APY
            </div>
            <div className="text-[#2DF4DD] text-xs">
              {coinConfig?.underlyingApy
                ? `${new Decimal(coinConfig.underlyingApy).mul(100).toFixed(2)} %`
                : "--"}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-col items-start py-4 px-2.5 gap-2.5">
            <div className="text-white/60 text-xs h-12 sm:h-auto">
              7D Avg. Underlying APY
            </div>
            <div className="text-[#2DF4DD] text-xs">
              {coinConfig?.sevenAvgUnderlyingApy
                ? `${new Decimal(coinConfig.sevenAvgUnderlyingApy).mul(100).toFixed(2)} %`
                : "--"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
