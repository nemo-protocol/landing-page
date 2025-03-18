import dayjs from "dayjs"
import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState, useEffect, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
import AmountInput from "@/components/AmountInput"
import ActionButton from "@/components/ActionButton"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Transaction } from "@mysten/sui/transactions"
import { parseErrorMessage, parseGasErrorMessage } from "@/lib/errorMapping"
import usePyPositionData from "@/hooks/usePyPositionData"
import { Info, ChevronsDown } from "lucide-react"
import { formatDecimalValue, isValidAmount, debounce } from "@/lib/utils"
import { useCoinConfig } from "@/queries"
import { showTransactionDialog } from "@/lib/dialog"
import TradeInfo from "@/components/TradeInfo"
import { Skeleton } from "@/components/ui/skeleton"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"
import useQueryPtOutBySyInWithVoucher from "@/hooks/dryRun/pt/useQueryPtOutBySyIn"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import {
  getPriceVoucher,
  initPyPosition,
  splitCoinHelper,
  mintSCoin,
  depositSyCoin,
  swapExactSyForPt,
} from "@/lib/txHelper"
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
import useMarketStateData from "@/hooks/useMarketStateData"
import useInvestRatio from "@/hooks/actions/useInvestRatio"
import { CoinConfig } from "@/queries/types/market"
import { ContractError } from "@/hooks/types"
import useGetApproxPtOutDryRun from "@/hooks/dryRun/useGetApproxPtOutDryRun"
import useSwapExactSyForPtDryRun from "@/hooks/dryRun/useSwapExactSyForPtDryRun"
import useGetConversionRateDryRun from "@/hooks/dryRun/useGetConversionRateDryRun"
import useQueryPtRatio from "@/hooks/useQueryPtRatio"

export default function Invest() {
  const [txId, setTxId] = useState("")
  const [warning, setWarning] = useState("")
  const { coinType, maturity } = useParams()
  const isDev = process.env.NODE_ENV === "development"
  const [error, setError] = useState<string>()
  const [swapValue, setSwapValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [ptValue, setPtValue] = useState<string>()
  const [ptFeeValue, setPtFeeValue] = useState<string>()
  const [isSwapping, setIsSwapping] = useState(false)
  const [tokenType, setTokenType] = useState<number>(0)
  const [errorDetail, setErrorDetail] = useState<string>()
  const [isCalcPtLoading, setIsCalcPtLoading] = useState(false)
  const [isInitRatioLoading, setIsInitRatioLoading] = useState(false)
  const [conversionRate, setConversionRate] = useState<string>()
  const [ptRatio, setPtRatio] = useState<Decimal>(new Decimal(0))
  const [syValue, setSyValue] = useState("")

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const { address } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

  const { data: marketStateData } = useMarketStateData(
    coinConfig?.marketStateId,
  )

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

  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const { isLoading } = useInputLoadingState(swapValue, isConfigLoading)

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isConfigLoading || isCalcPtLoading || isInitRatioLoading,
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

  const { mutateAsync: queryPtOut } = useQueryPtOutBySyInWithVoucher({
    outerCoinConfig: coinConfig,
  })
  const { mutateAsync: swapExactSyForPtDryRun } =
    useSwapExactSyForPtDryRun(coinConfig)

  const { data: ptYtData, refresh: refreshPtYt } = useCalculatePtYt(
    coinConfig,
    marketStateData,
  )

  const { mutateAsync: calculateRatio } = useInvestRatio(coinConfig)

  const { mutateAsync: getApproxPtOut } = useGetApproxPtOutDryRun(coinConfig)

  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  const { data: initPtRatio } = useQueryPtRatio(coinConfig, "1000")

  const debouncedGetPtOut = useCallback(
    (value: string, decimal: number, config?: CoinConfig) => {
      const getPtOut = debounce(async () => {
        setError(undefined)
        if (
          isValidAmount(value) &&
          decimal &&
          config &&
          coinType &&
          coinConfig
        ) {
          setIsCalcPtLoading(true)
          try {
            const rate = await getConversionRate(coinConfig)
            setConversionRate(rate)
            const swapAmount = new Decimal(value).mul(10 ** decimal).toFixed(0)

            const syAmount = new Decimal(swapAmount)
              .div(tokenType === 0 ? rate : 1)
              .toFixed(0)

            const {
              ptValue,
              syValue,
              tradeFee,
              syAmount: newSyAmount,
            } = await queryPtOut({ syAmount })

            console.log(
              "syValue",
              syValue,
              "ptValue",
              ptValue,
              "underlying value",
              new Decimal(syValue).mul(tokenType === 0 ? rate : 1).toString(),
            )

            setSyValue(syValue)

            setPtFeeValue(tradeFee)

            const minPtOut = new Decimal(ptValue)
              .mul(10 ** decimal)
              .mul(1 - new Decimal(slippage).div(100).toNumber())
              .toFixed(0)

            const approxPtOut = await getApproxPtOut({
              netSyIn: syAmount,
              minPtOut,
            })

            const actualSwapAmount = new Decimal(newSyAmount)
              .mul(tokenType === 0 ? rate : 1)
              .toFixed(0)

            console.log("actualSwapAmount", actualSwapAmount)

            try {
              if (address && coinData?.length) {
                const newPtValue = await swapExactSyForPtDryRun({
                  coinData,
                  coinType,
                  minPtOut,
                  tokenType,
                  approxPtOut,
                  swapAmount: actualSwapAmount,
                })

                const ptRatio = new Decimal(ptValue).div(syValue)

                console.log(
                  "show rate calc ptRatio",
                  ptRatio.toString(),
                  "syValue",
                  syValue,
                  "ptValue",
                  ptValue,
                )

                // .mul(tokenType === 0 ? rate : 1)
                setPtRatio(ptRatio)
                setPtValue(newPtValue)
              } else {
                throw new Error("Please connect your wallet")
              }
            } catch (dryRunError) {
              const ptRatio = new Decimal(ptValue)
                .div(syValue)
                .mul(tokenType === 0 ? rate : 1)
              setPtRatio(ptRatio)
              setPtValue(ptValue)
            }
          } catch (errorMsg) {
            const { error, detail } = parseErrorMessage(
              (errorMsg as ContractError)?.message ?? errorMsg,
            )
            setError(error)
            setErrorDetail(detail)
            setPtValue(undefined)
            setPtFeeValue(undefined)
          } finally {
            setIsCalcPtLoading(false)
          }
        } else {
          setPtValue(undefined)
          setPtFeeValue(undefined)
          setError(undefined)
        }
      }, 500)
      getPtOut()
      return getPtOut.cancel
    },
    [
      coinType,
      coinConfig,
      getConversionRate,
      tokenType,
      queryPtOut,
      slippage,
      getApproxPtOut,
      address,
      coinData,
      swapExactSyForPtDryRun,
    ],
  )

  useEffect(() => {
    const cancelFn = debouncedGetPtOut(swapValue, decimal ?? 0, coinConfig)
    return () => {
      cancelFn()
    }
  }, [swapValue, decimal, coinConfig, debouncedGetPtOut])

  useEffect(() => {
    async function initRatio() {
      try {
        setIsInitRatioLoading(true)
        const rate = await getConversionRate(coinConfig)
        setConversionRate(rate)
        // const initialRatio = await calculateRatio(tokenType === 0 ? rate : "1")
        // setIn(initialRatio)
      } catch (error) {
        console.error("Failed to calculate initial ratio:", error)
      } finally {
        setIsInitRatioLoading(false)
      }
    }
    if (coinConfig) {
      initRatio()
    }
  }, [calculateRatio, getConversionRate, tokenType, coinConfig])

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchPyPosition(),
      refetchCoinData(),
    ])
  }, [refetchCoinConfig, refetchPyPosition, refetchCoinData])

  async function swap() {
    if (
      address &&
      coinType &&
      swapValue &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        setIsSwapping(true)
        const tx = new Transaction()
        const rate = await getConversionRate(coinConfig)
        setConversionRate(rate)
        const swapAmount = new Decimal(swapValue).mul(10 ** decimal).toFixed(0)
        const syAmount = new Decimal(swapAmount)
          .div(tokenType === 0 ? rate : 1)
          .toFixed(0)

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id)
        }

        const { ptAmount, syAmount: newSyAmount } = await queryPtOut({
          syAmount,
        })

        const minPtOut = new Decimal(ptAmount)
          .mul(1 - new Decimal(slippage).div(100).toNumber())
          .toFixed(0)

        const approxPtOut = await getApproxPtOut({
          netSyIn: newSyAmount,
          minPtOut,
        })

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const actualSwapAmount = new Decimal(newSyAmount)
          .mul(tokenType === 0 ? rate : 1)
          .toFixed(0)

        const [splitCoin] =
          tokenType === 0
            ? mintSCoin(tx, coinConfig, coinData, [actualSwapAmount])
            : splitCoinHelper(tx, coinData, [actualSwapAmount], coinType)

        const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

        swapExactSyForPt(
          tx,
          coinConfig,
          syCoin,
          priceVoucher,
          pyPosition,
          minPtOut,
          approxPtOut,
        )

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })

        setTxId(res.digest)
        showTransactionDialog({
          status: "Success",
          network,
          txId: res.digest,
          onClose: () => {
            setTxId("")
          },
        })
        setSwapValue("")

        await refreshData()
        await refreshPtYt()
      } catch (errorMsg) {
        let msg = (errorMsg as Error)?.message ?? error
        const gasMsg = parseGasErrorMessage(msg)
        if (gasMsg) {
          msg = gasMsg
        } else if (
          msg.includes(
            "Transaction failed with the following error. Dry run failed, could not automatically determine a budget: InsufficientGas in command 5",
          )
        ) {
          msg = "Insufficient PT in the pool."
        } else {
          const { error } = parseErrorMessage(msg)
          msg = error
        }
        showTransactionDialog({
          status: "Failed",
          network,
          txId,
          message:
            gasMsg ||
            (msg.includes("InsufficientGas in command 5")
              ? "Insufficient PT in the pool."
              : error),
          onClose: () => {
            setTxId("")
          },
        })
      } finally {
        setIsSwapping(false)
      }
    }
  }

  const hasLiquidity = useMemo(() => {
    return isValidAmount(marketStateData?.lpSupply)
  }, [marketStateData])

  const btnDisabled = useMemo(() => {
    return !hasLiquidity || insufficientBalance || !isValidAmount(swapValue)
  }, [swapValue, insufficientBalance, hasLiquidity])

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
    return "Invest"
  }, [hasLiquidity, insufficientBalance, swapValue, coinName])

  const priceImpact = useMemo(() => {
    if (
      !ptValue ||
      !initPtRatio ||
      !ptRatio ||
      !swapValue ||
      !coinConfig?.coinPrice ||
      !ptYtData?.ptPrice
    ) {
      return undefined
    }

    const outputValue = new Decimal(ptValue).mul(ptYtData?.ptPrice)

    const value = outputValue
    const ratio = new Decimal(ptRatio).minus(initPtRatio).mul(100)

    console.log(
      "show rate  price impact ptRatio",
      ptRatio.toString(),
      "initPtRatio",
      initPtRatio.toString(),
      "ratio",
      ratio.toString(),
    )

    return { value, ratio }
  }, [
    ptValue,
    initPtRatio,
    ptRatio,
    swapValue,
    coinConfig?.coinPrice,
    ptYtData?.ptPrice,
  ])

  return (
    <div className="w-full bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-3 sm:gap-y-4">
        <div className="w-full relative">
          <h2 className="text-base sm:text-xl text-center">Invest</h2>
          {isDev && (
            <Link
              to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/sell/pt`}
              className="text-sm text-white/60 hover:text-white underline transition-colors absolute right-0 top-1/2 -translate-y-1/2"
            >
              Sell PT
            </Link>
          )}
        </div>
        <AmountInput
          price={price}
          error={error}
          decimal={decimal}
          warning={warning}
          amount={swapValue}
          coinName={coinName}
          coinLogo={coinLogo}
          isLoading={isLoading}
          setWarning={setWarning}
          disabled={!hasLiquidity}
          errorDetail={errorDetail}
          coinBalance={coinBalance}
          isConnected={isConnected}
          isConfigLoading={isConfigLoading}
          isBalanceLoading={isBalanceLoading}
          onChange={(value) => setSwapValue(value)}
          coinNameComponent={
            <Select
              value={tokenType.toString()}
              onValueChange={(value) => {
                setSwapValue("")
                setTokenType(Number(value))
              }}
            >
              <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="border-none outline-none bg-[#0E0F16]">
                <SelectGroup>
                  <SelectItem value={"0"} className="cursor-pointer text-white">
                    {coinConfig?.underlyingCoinName}
                  </SelectItem>
                  <SelectItem value={"1"} className="cursor-pointer text-white">
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
                  {isCalcPtLoading ? (
                    <Skeleton className="h-4 w-32 bg-[#2D2D48]" />
                  ) : (
                    ptValue && (
                      <div className="flex items-center gap-x-1">
                        <span>≈</span>
                        <span>{formatDecimalValue(ptValue, decimal)}</span>
                      </div>
                    )
                  )}
                  {isCalcPtLoading ? (
                    <Skeleton className="h-3 w-24 bg-[#2D2D48] mt-1" />
                  ) : (
                    priceImpact && (
                      <div className="flex items-center gap-x-1 text-xs">
                        {priceImpact.ratio.gt(5) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info
                                  className={`size-3 cursor-pointer ${
                                    priceImpact.ratio.gt(15)
                                      ? "text-red-500"
                                      : priceImpact.ratio.gt(5)
                                        ? "text-yellow-500"
                                        : "text-white/60"
                                  }`}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#12121B] max-w-[500px]">
                                <p>
                                  Price Impact Alert: Price impact is too high.
                                  Please consider adjusting the transaction
                                  size.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <span
                          className={`text-xs ${
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
                          className={`text-xs ${
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
                    )
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span>PT {coinConfig?.coinName}</span>
                  <span className="text-white/60 text-xs">
                    {dayjs(
                      parseInt(coinConfig?.maturity || Date.now().toString()),
                    ).format("DD MMM YYYY")}
                  </span>
                </div>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-8 sm:size-[28px]"
                />
              </div>
            </div>
          </div>
          <hr className="border-t border-[#2D2D48] mt-6" />
          <div className="flex items-center justify-between mt-6">
            <span>Fixed APY</span>
            <span className="underline">
              {ptYtData?.ptApy
                ? `${new Decimal(ptYtData.ptApy).toFixed(6)} %`
                : "--"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-6 h-[24px] sm:h-[28px]">
            <span className="flex items-center gap-x-1">
              <span>Fixed Return</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-2.5 sm:size-3 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#20283C] rounded-md border-none">
                    <p>
                      You can sell PT prior to maturity. Alternatively, you can
                      hold PT until maturity to obtain a fixed return.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>

            {!swapValue ? (
              "--"
            ) : isCalcPtLoading ? (
              <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
            ) : (
              <div className="flex items-center gap-x-1.5">
                <span>
                  +
                  {ptValue && decimal && ptValue && conversionRate
                    ? formatDecimalValue(
                        new Decimal(ptValue).minus(
                          new Decimal(syValue).mul(conversionRate),
                        ),
                        decimal,
                      )
                    : "--"}
                </span>
                <span>{coinConfig?.underlyingCoinName}</span>
                <img
                  src={coinConfig?.underlyingCoinLogo}
                  alt={coinConfig?.underlyingCoinName}
                  className="size-8 sm:size-[28px]"
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-white/60 text-[10px] sm:text-xs">
            <span>
              After{" "}
              {dayjs(
                parseInt(coinConfig?.maturity || Date.now().toString()),
              ).diff(dayjs(), "day")}{" "}
              days
            </span>
            <span>
              {!swapValue ? (
                "--"
              ) : isCalcPtLoading ? (
                <Skeleton className="h-4 w-20 bg-[#2D2D48]" />
              ) : decimal && conversionRate && coinConfig?.underlyingPrice ? (
                `≈ $${
                  ptValue && decimal && ptValue && conversionRate
                    ? formatDecimalValue(
                        new Decimal(ptValue)
                          .minus(new Decimal(syValue).mul(conversionRate))
                          .mul(coinConfig.underlyingPrice),
                        decimal,
                      )
                    : "--"
                }`
              ) : (
                "--"
              )}
            </span>
          </div>
        </div>
        <TradeInfo
          ratio={!swapValue ? initPtRatio?.toString() : ptRatio.toString()}
          coinName={coinName}
          slippage={slippage}
          isLoading={isLoading}
          setSlippage={setSlippage}
          onRefresh={async () => {
            if (conversionRate) {
              try {
                setIsCalcPtLoading(true)
                setIsCalcPtLoading(false)
              } catch (error) {
                console.error("Failed to refresh ratio:", error)
              } finally {
                setIsCalcPtLoading(false)
              }
            }
          }}
          isRatioLoading={isRatioLoading}
          tradeFee={ptFeeValue}
          targetCoinName={`PT ${coinConfig?.coinName}`}
        />
        <ActionButton
          onClick={swap}
          btnText={btnText}
          loading={isSwapping}
          disabled={btnDisabled}
        />
      </div>
    </div>
  )
}
