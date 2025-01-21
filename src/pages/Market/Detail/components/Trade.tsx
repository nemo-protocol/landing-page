import Decimal from "decimal.js"
import { DEBUG, debugLog, network } from "@/config"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { ChevronsDown } from "lucide-react"
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
import useCoinData from "@/hooks/useCoinData"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage, parseGasErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { formatDecimalValue, isValidAmount, debounce } from "@/lib/utils"
import {
  depositSyCoin,
  getPriceVoucher,
  initPyPosition,
  mintSCoin,
  splitCoinHelper,
} from "@/lib/txHelper"
import ActionButton from "@/components/ActionButton"
import AmountInput from "@/components/AmountInput"
import { useWallet } from "@nemoprotocol/wallet-kit"
import dayjs from "dayjs"
import TradeInfo from "@/components/TradeInfo"
import { Skeleton } from "@/components/ui/skeleton"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"
import useTradeRatio from "@/hooks/actions/useTradeRatio"
import useQueryYtOutBySyInWithVoucher from "@/hooks/useQueryYtOutBySyInWithVoucher"
import useMarketStateData from "@/hooks/useMarketStateData"
import { CoinConfig } from "@/queries/types/market"

export default function Trade() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [warning, setWarning] = useState("")
  const { coinType, maturity } = useParams()
  // const currentAccount = useCurrentAccount()
  const [swapValue, setSwapValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState<number>(0) // 0-native coin, 1-wrapped coin
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [ytOut, setYtOut] = useState<string>()
  const [error, setError] = useState<string>()
  const [isSwapping, setIsSwapping] = useState(false)
  const [ratio, setRatio] = useState<string>("")
  const [isCalcYtLoading, setIsCalcYtLoading] = useState(false)
  const [isInitRatioLoading, setIsInitRatioLoading] = useState(false)

  const { address, signAndExecuteTransaction } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

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
          setRatio(initialRatio)
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
        if (value && decimal && config && conversionRate) {
          setIsCalcYtLoading(true)
          try {
            setError(undefined)
            const swapAmount = new Decimal(value)
              .div(tokenType === 0 ? conversionRate : 1)
              .mul(10 ** decimal)
              .toFixed(0)
            const [ytOut] = await queryYtOut(swapAmount)
            setYtOut(ytOut)

            const ytRatio = new Decimal(ytOut)
              .div(10 ** decimal)
              .div(value)
              .toFixed(4)
            setRatio(ytRatio)
          } catch (error) {
            console.error("Failed to fetch YT out amount:", error)
            setError((error as Error).message || "Failed to fetch YT amount")
            setYtOut(undefined)
            setRatio("")
          } finally {
            setIsCalcYtLoading(false)
          }
        } else {
          setYtOut(undefined)
          setRatio("")
          setError(undefined)
        }
      }, 500)
      getYtOut()
      return getYtOut.cancel
    },
    [queryYtOut, tokenType, conversionRate],
  )

  useEffect(() => {
    const cancelFn = debouncedGetYtOut(swapValue, decimal ?? 0, coinConfig)
    return () => {
      cancelFn()
    }
  }, [swapValue, decimal, coinConfig, debouncedGetYtOut])


  const { data: ptYtData } = useCalculatePtYt(coinConfig, marketStateData)

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

        const syCoinAmount = new Decimal(swapValue)
          .div(tokenType === 0 ? conversionRate : 1)
          .mul(10 ** decimal)
          .toFixed(0)

        const [ytOut] = await queryYtOut(syCoinAmount)
        const minYtOut = new Decimal(ytOut)
          .mul(1 - new Decimal(slippage).div(100).toNumber())
          .toFixed(0)

        const [splitCoin] =
          tokenType === 0
            ? mintSCoin(tx, coinConfig, coinData, [
                new Decimal(swapValue).mul(10 ** decimal).toFixed(0),
              ])
            : splitCoinHelper(tx, coinData, [syCoinAmount], coinType)

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
        tx.moveCall({
          target: `${coinConfig.nemoContractId}::router::swap_exact_sy_for_yt`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(minYtOut),
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
            "syCoin",
            "priceVoucher",
            "pyPosition",
            coinConfig.pyStateId,
            coinConfig.syStateId,
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

        setTxId(res.digest)
        setStatus("Success")
        setOpen(true)
        setSwapValue("")

        await refreshData()
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        const gasMsg = parseGasErrorMessage(msg)
        if (gasMsg) {
          setMessage(gasMsg)
        } else if (
          msg.includes(
            "Transaction failed with the following error. Dry run failed, could not automatically determine a budget: InsufficientGas in command 5",
          )
        ) {
          setMessage("Insufficient YT in the pool.")
        } else {
          setMessage(parseErrorMessage(msg || ""))
        }
      } finally {
        setIsSwapping(false)
      }
    }
  }

  return (
    <div className="w-full md:w-[650px] lg:w-full flex flex-col lg:flex-row gap-5">
      <div className="lg:w-[500px] bg-[#12121B] rounded-3xl p-6 border border-white/[0.07] shrink-0">
        <div className="flex flex-col items-center gap-y-4">
          <h2 className="text-center text-xl">Trade</h2>
          {/* TODO: add into global */}
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
            price={price}
            decimal={decimal}
            amount={swapValue}
            coinName={coinName}
            coinLogo={coinLogo}
            isLoading={isLoading}
            coinBalance={coinBalance}
            isConnected={isConnected}
            isConfigLoading={isConfigLoading}
            isBalanceLoading={isBalanceLoading}
            error={error}
            disabled={!hasLiquidity}
            warning={warning}
            setWarning={setWarning}
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
                <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base w-fit">
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
          <ChevronsDown className="size-6" />
          <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
            <div className="flex flex-col items-end gap-y-1">
              <div className="flex items-center justify-between w-full h-[28px]">
                <span>Receiving</span>
                <span>
                  {!swapValue ? (
                    "--"
                  ) : isCalcYtLoading ? (
                    <Skeleton className="h-7 w-60 bg-[#2D2D48]" />
                  ) : !decimal || !ytOut ? (
                    "--"
                  ) : (
                    <span className="flex items-center gap-x-1.5">
                      {"≈  " +
                        (ytOut
                          ? formatDecimalValue(
                              new Decimal(ytOut).div(10 ** decimal),
                              decimal,
                            )
                          : "NAN")}{" "}
                      <span>YT {coinConfig?.coinName}</span>
                      <img
                        src={coinConfig?.coinLogo}
                        alt={coinConfig?.coinName}
                        className="size-[28px]"
                      />
                    </span>
                  )}
                </span>
              </div>
              <div className="text-xs text-white/60">
                {coinConfig?.maturity
                  ? dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")
                  : "--"}
              </div>
            </div>
            <hr className="border-t border-[#2D2D48] mt-6" />
            <div className="flex items-center justify-between mt-6">
              <span>Leveraged Yield APY</span>
              <span className="underline">
                {ptYtData?.ytApy
                  ? `${new Decimal(ptYtData.ytApy).toFixed(6)} %`
                  : "--"}
              </span>
            </div>
          </div>
          <TradeInfo
            ratio={ratio}
            coinName={coinName}
            slippage={slippage}
            isLoading={isLoading}
            setSlippage={setSlippage}
            // FIXME: need to optimize
            onRefresh={async () => {
              if (conversionRate) {
                try {
                  setIsCalcYtLoading(true)
                  const newRatio = await calculateRatio(
                    tokenType === 0 ? conversionRate : "1",
                  )
                  setRatio(newRatio)
                } catch (error) {
                  console.error("Failed to refresh ratio:", error)
                  setRatio("")
                } finally {
                  setIsCalcYtLoading(false)
                }
              }
            }}
            isRatioLoading={isRatioLoading}
            tradeFee={
              !!swapValue &&
              !!conversionRate &&
              !!coinConfig?.feeRate &&
              !!coinConfig?.coinPrice
                ? new Decimal(coinConfig.feeRate)
                    .mul(
                      tokenType === 0
                        ? new Decimal(swapValue).mul(conversionRate)
                        : swapValue,
                    )
                    .mul(coinConfig.coinPrice)
                    .toString()
                : undefined
            }
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
      <div className="grow space-y-5 bg-[#12121B] rounded-3xl p-6 border border-white/[0.07] @container">
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
          <div className="flex flex-col items-start py-4 pl-[22px] gap-2.5">
            <div className="text-white/60 text-xs">Underlying Protocol</div>
            <div className="flex items-center gap-x-1">
              <img
                className="size-3.5"
                src={coinConfig?.underlyingProtocolLogo}
                alt={coinConfig?.underlyingProtocol}
              />
              <div className="text-xs">{coinConfig?.underlyingProtocol}</div>
            </div>
          </div>
          <div className="flex flex-col items-start py-4 pl-[22px] gap-2.5">
            <div className="text-white/60 text-xs">Underlying APY</div>
            <div className="text-[#2DF4DD] text-xs">
              {coinConfig?.underlyingApy
                ? `${new Decimal(coinConfig.underlyingApy).mul(100).toFixed(2)} %`
                : "--"}
            </div>
          </div>
          <div className="flex flex-col items-start py-4 pl-[22px] gap-2.5">
            <div className="text-white/60 text-xs">7D Avg. Underlying APY</div>
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
