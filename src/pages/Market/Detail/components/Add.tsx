import dayjs from "dayjs"
import Decimal from "decimal.js"
import { useMemo, useState, useEffect, useCallback } from "react"
import useCoinData from "@/hooks/useCoinData"
import TradeInfo from "@/components/TradeInfo"
import PoolSelect from "@/components/PoolSelect"
import { ChevronsDown, Info } from "lucide-react"
import AmountInput from "@/components/AmountInput"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { network, debugLog } from "@/config"
import ActionButton from "@/components/ActionButton"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import { parseErrorMessage } from "@/lib/errorMapping"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { useParams, useNavigate } from "react-router-dom"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import usePyPositionData from "@/hooks/usePyPositionData"
import { useCoinConfig } from "@/queries"
import { formatDecimalValue, debounce, isValidAmount } from "@/lib/utils"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { CoinConfig } from "@/queries/types/market"
import { useCalculateLpOut } from "@/hooks/useCalculateLpOut"
import useMarketStateData from "@/hooks/useMarketStateData"
import {
  mintSCoin,
  initPyPosition,
  getPriceVoucher,
  splitCoinHelper,
  depositSyCoin,
  mintPY,
  redeemSyCoin,
  mergeAllLpPositions,
} from "@/lib/txHelper"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select"
import { useAddLiquidityRatio } from "@/hooks/actions/useAddLiquidityRatio"
import useFetchLpPosition from "@/hooks/useFetchLpPosition"
import useMintLpDryRun from "@/hooks/dryRun/useMintLpDryRun"
import useAddLiquiditySingleSyDryRun from "@/hooks/dryRun/lp/useAddLiquiditySingleSyDryRun"
import useSeedLiquidityDryRun from "@/hooks/dryRun/useSeedLiquidityDryRun"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import type { CoinData } from "@/hooks/useCoinData"
import { useAddLiquiditySingleSy } from "@/hooks/actions/useAddLiquiditySingleSy"
import useQueryConversionRate from "@/hooks/query/useQueryConversionRate"

export default function SingleCoin() {
  const navigate = useNavigate()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [warning, setWarning] = useState("")
  const [error, setError] = useState("")
  const [errorDetail, setErrorDetail] = useState("")
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState<number>(0)
  const [lpAmount, setLpAmount] = useState<string>()
  const [lpFeeAmount, setLpFeeAmount] = useState<string>()
  const [ytAmount, setYtAmount] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [isAdding, setIsAdding] = useState(false)
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()
  const [isCalcLpLoading, setIsCalcLpLoading] = useState(false)
  const [ratio, setRatio] = useState<string>()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

  const { data: conversionRate } = useQueryConversionRate(coinConfig)

  const { mutateAsync: handleAddLiquiditySingleSy } =
    useAddLiquiditySingleSy(coinConfig)

  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const {
    data: coinData,
    isLoading: isBalanceLoading,
    refetch: refetchCoinData,
  } = useCoinData(
    address,
    tokenType === 0 ? coinConfig?.underlyingCoinType : coinType,
  )

  const { mutateAsync: fetchLpPositions } = useFetchLpPosition(coinConfig)

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

  const decimal = useMemo(() => Number(coinConfig?.decimal || 0), [coinConfig])

  const { mutateAsync: calculateLpOut, isPending: isLpAmountOutLoading } =
    useCalculateLpOut(coinConfig)

  const { mutateAsync: mintLpDryRun } = useMintLpDryRun(coinConfig)
  const { mutateAsync: addLiquiditySingleSyDryRun } =
    useAddLiquiditySingleSyDryRun(coinConfig)
  const { mutateAsync: seedLiquidityDryRun } =
    useSeedLiquidityDryRun(coinConfig)

  const { data: marketStateData, isLoading: isMarketStateDataLoading } =
    useMarketStateData(coinConfig?.marketStateId)

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
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  const { data: ptYtData, refresh: refreshPtYt } = useCalculatePtYt(
    coinConfig,
    marketStateData,
  )
  const [ptRatio, syRatio] = useMemo(() => {
    if (
      ptYtData?.ptTvl &&
      ptYtData?.syTvl &&
      !new Decimal(ptYtData.ptTvl).isZero() &&
      !new Decimal(ptYtData.syTvl).isZero()
    ) {
      const totalTvl = new Decimal(ptYtData.ptTvl).add(
        new Decimal(ptYtData.syTvl),
      )
      return [
        new Decimal(ptYtData.ptTvl).div(totalTvl).mul(100).toFixed(2),
        new Decimal(ptYtData.syTvl).div(totalTvl).mul(100).toFixed(2),
      ]
    }
    return ["0", "0"]
  }, [ptYtData])

  const { isLoading } = useInputLoadingState(
    addValue,
    isConfigLoading || isLpAmountOutLoading || isCalcLpLoading,
  )

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isConfigLoading || isCalcLpLoading,
  )

  const btnDisabled = useMemo(() => {
    return !isValidAmount(addValue) || insufficientBalance || isCalcLpLoading
  }, [addValue, insufficientBalance, isCalcLpLoading])

  const btnText = useMemo(() => {
    if (insufficientBalance) {
      return `Insufficient ${coinName} balance`
    }
    if (addValue === "") {
      return "Please enter an amount"
    }
    return "Add"
  }, [insufficientBalance, addValue, coinName])

  const { mutateAsync: calculateRatio } = useAddLiquidityRatio(
    coinConfig,
    marketStateData,
  )

  // FIXME: update handleRefresh
  const handleRefresh = useCallback(async () => {
    try {
      setIsCalcLpLoading(true)
      const newRatio = await calculateRatio()
      setRatio(
        tokenType === 0
          ? new Decimal(newRatio).mul(conversionRate || 0).toString()
          : newRatio,
      )
    } catch (error) {
      console.error("Failed to refresh ratio:", error)
      setRatio("")
    } finally {
      setIsCalcLpLoading(false)
    }
  }, [calculateRatio, conversionRate, tokenType])

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchPyPosition(),
      refetchCoinData(),
    ])
  }, [refetchCoinConfig, refetchPyPosition, refetchCoinData])

  useEffect(() => {
    if (coinConfig && marketStateData) {
      handleRefresh()
    }
  }, [coinConfig, handleRefresh, marketStateData])

  const debouncedGetLpPosition = useCallback(
    (value: string, decimal: number, config: CoinConfig | undefined) => {
      const getLpPosition = debounce(async () => {
        if (config && decimal && isValidAmount(value) && coinData?.length) {
          setIsCalcLpLoading(true)
          const inputAmount = new Decimal(value).mul(10 ** decimal).toString()
          try {
            if (marketStateData?.lpSupply === "0") {
              const { lpAmount, ytAmount } = await seedLiquidityDryRun({
                addAmount: inputAmount,
                tokenType,
                coinData,
                pyPositions: pyPositionData,
              })

              setLpAmount(
                new Decimal(lpAmount).div(10 ** decimal).toFixed(decimal),
              )
              setYtAmount(
                new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal),
              )
            } else if (
              marketStateData &&
              new Decimal(marketStateData.totalSy).mul(0.4).lt(inputAmount)
            ) {
              const { lpAmount, ytAmount } = await mintLpDryRun({
                addAmount: inputAmount,
                tokenType,
                coinData,
                pyPositions: pyPositionData,
              })

              setLpAmount(
                new Decimal(lpAmount).div(10 ** decimal).toFixed(decimal),
              )
              setYtAmount(
                new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal),
              )
            } else {
              const [lpAmount, lpFeeAmount] = await addLiquiditySingleSyDryRun({
                coinData,
                tokenType,
                addAmount: inputAmount,
                pyPositions: pyPositionData,
              })

              setLpAmount(lpAmount)
              setLpFeeAmount(lpFeeAmount)
              setYtAmount(undefined)
            }
          } catch (error) {
            try {
              const lpOut = await calculateLpOut(inputAmount)
              setLpAmount(lpOut.lpAmount)
              setLpFeeAmount(undefined)
              setYtAmount(undefined)
            } catch (errorMsg) {
              setLpAmount(undefined)
              setYtAmount(undefined)
              setLpFeeAmount(undefined)
              const { error, detail } = parseErrorMessage(errorMsg as string)
              setError(error)
              setErrorDetail(detail)
            }
          } finally {
            setIsCalcLpLoading(false)
          }
        } else {
          setLpAmount(undefined)
          setYtAmount(undefined)
        }
      }, 500)
      getLpPosition()
      return getLpPosition.cancel
    },
    [
      mintLpDryRun,
      addLiquiditySingleSyDryRun,
      seedLiquidityDryRun,
      tokenType,
      coinData,
      pyPositionData,
      marketStateData,
      calculateLpOut,
    ],
  )

  useEffect(() => {
    const cancelFn = debouncedGetLpPosition(addValue, decimal ?? 0, coinConfig)
    return () => {
      cancelFn()
    }
  }, [addValue, decimal, coinConfig, debouncedGetLpPosition])

  async function handleSeedLiquidity(
    tx: Transaction,
    addAmount: string,
    tokenType: number,
    coinConfig: CoinConfig,
    coinData: CoinData[],
    coinType: string,
    pyPosition: TransactionArgument,
    address: string,
    minLpAmount: string,
  ): Promise<void> {
    const [splitCoin] =
      tokenType === 0
        ? mintSCoin(tx, coinConfig, coinData, [addAmount])
        : splitCoinHelper(tx, coinData, [addAmount], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

    const [priceVoucher] = getPriceVoucher(tx, coinConfig)

    const seedLiquidityMoveCall = {
      target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
      arguments: [
        coinConfig.version,
        "syCoin",
        minLpAmount,
        "priceVoucher",
        "pyPosition",
        coinConfig.pyStateId,
        coinConfig.yieldFactoryConfigId,
        coinConfig.marketStateId,
        "0x6",
      ],
      typeArguments: [coinConfig.syCoinType],
    }
    debugLog("seed_liquidity move call:", seedLiquidityMoveCall)

    const [lp] = tx.moveCall({
      ...seedLiquidityMoveCall,
      arguments: [
        tx.object(coinConfig.version),
        syCoin,
        tx.pure.u64(minLpAmount),
        priceVoucher,
        pyPosition,
        tx.object(coinConfig.pyStateId),
        tx.object(coinConfig.yieldFactoryConfigId),
        tx.object(coinConfig.marketStateId),
        tx.object("0x6"),
      ],
    })

    tx.transferObjects([lp], address)
  }

  async function handleMintLp(
    tx: Transaction,
    addAmount: string,
    tokenType: number,
    coinConfig: CoinConfig,
    coinData: CoinData[],
    coinType: string,
    pyPosition: TransactionArgument,
    address: string,
    minLpAmount: string,
  ): Promise<void> {
    const lpOut = await calculateLpOut(addAmount)
    const amounts = {
      syForPt: new Decimal(lpOut.syForPtValue).toFixed(0),
      sy: new Decimal(lpOut.syValue).toFixed(0),
    }

    const [splitCoinForSy, splitCoinForPt] =
      tokenType === 0
        ? mintSCoin(tx, coinConfig, coinData, [amounts.sy, amounts.syForPt])
        : splitCoinHelper(tx, coinData, [amounts.sy, amounts.syForPt], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoinForSy, coinType)

    const pyCoin = depositSyCoin(tx, coinConfig, splitCoinForPt, coinType)
    const [priceVoucher] = getPriceVoucher(tx, coinConfig)
    const [pt_amount] = mintPY(tx, coinConfig, pyCoin, priceVoucher, pyPosition)

    const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

    const mintLpMoveCall = {
      target: `${coinConfig.nemoContractId}::market::mint_lp`,
      arguments: [
        coinConfig.version,
        syCoin,
        pt_amount,
        tx.pure.u64(minLpAmount),
        priceVoucherForMintLp,
        pyPosition,
        coinConfig.pyStateId,
        coinConfig.marketStateId,
        "0x6",
      ],
      typeArguments: [coinConfig.syCoinType],
    }
    debugLog("mint_lp move call:", mintLpMoveCall)

    const [remainingSyCoin, marketPosition] = tx.moveCall({
      ...mintLpMoveCall,
      arguments: [
        tx.object(coinConfig.version),
        syCoin,
        pt_amount,
        tx.pure.u64(minLpAmount),
        priceVoucherForMintLp,
        pyPosition,
        tx.object(coinConfig.pyStateId),
        tx.object(coinConfig.marketStateId),
        tx.object("0x6"),
      ],
    })

    const yieldToken = redeemSyCoin(tx, coinConfig, remainingSyCoin)
    const lpPositions = await fetchLpPositions()
    const mergedPosition = mergeAllLpPositions(
      tx,
      coinConfig,
      lpPositions,
      marketPosition,
    )
    tx.transferObjects([yieldToken, mergedPosition], address)
  }

  async function add() {
    if (
      decimal &&
      address &&
      coinType &&
      slippage &&
      lpAmount &&
      coinConfig &&
      conversionRate &&
      marketStateData &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        setIsAdding(true)
        const addAmount = new Decimal(addValue).mul(10 ** decimal).toFixed(0)

        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id)
        }

        console.log("lpAmount", lpAmount)

        const minLpAmount = new Decimal(lpAmount)
          .mul(10 ** decimal)
          .mul(1 - new Decimal(slippage).div(100).toNumber())
          .toFixed(0)
        console.log("minLpAmount", minLpAmount)

        if (marketStateData.lpSupply === "0") {
          await handleSeedLiquidity(
            tx,
            addAmount,
            tokenType,
            coinConfig,
            coinData,
            coinType,
            pyPosition,
            address,
            minLpAmount,
          )
        } else if (
          new Decimal(marketStateData.totalSy).mul(0.4).lt(addAmount)
        ) {
          await handleMintLp(
            tx,
            addAmount,
            tokenType,
            coinConfig,
            coinData,
            coinType,
            pyPosition,
            address,
            minLpAmount,
          )
        } else {
          await handleAddLiquiditySingleSy({
            tx,
            address,
            coinType,
            coinData,
            addAmount,
            tokenType,
            pyPosition,
            coinConfig,
            minLpAmount,
            conversionRate,
          })
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(res.digest)
        setAddValue("")
        setStatus("Success")

        await refreshData()
        await refreshPtYt()
      } catch (errorMsg) {
        setStatus("Failed")
        const { error: msg, detail } = parseErrorMessage(
          (errorMsg as Error)?.message ?? "",
        )
        setMessage(msg)
        setErrorDetail(detail)
      } finally {
        setOpen(true)
        setIsAdding(false)
      }
    }
  }

  const test = async () => {
    if (coinConfig && coinData && address) {
      const addAmount = new Decimal(addValue).mul(10 ** decimal).toFixed(0)
      const tx = new Transaction()
      const [splitCoin] = mintSCoin(tx, coinConfig, coinData, [addAmount])
      tx.transferObjects([splitCoin], address)
      const res = await signAndExecuteTransaction({
        transaction: tx,
      })
      setTxId(res.digest)
      setAddValue("")
      setStatus("Success")

      await refreshData()
      await refreshPtYt()
    }
  }

  return (
    <div className="w-full md:w-[500px] lg:w-full bg-[#0E0F16] rounded-xl md:rounded-2xl xl:rounded-[40px] p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-4 sm:gap-8">
        {/* Left Panel */}
        <div className="space-y-3 sm:space-y-4">
          <PoolSelect
            coinType={coinType}
            maturity={maturity}
            onChange={(coinAddress, maturity) => {
              navigate(`/market/detail/${coinAddress}/${maturity}/add`, {
                replace: true,
              })
            }}
          />

          {/* Add Liquidity Panel */}
          <div className="bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
            <div className="flex flex-col items-center gap-y-3 sm:gap-y-4">
              <h2 className="text-center text-base sm:text-xl" onClick={test}>
                Add Liquidity
              </h2>

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
                amount={addValue}
                coinName={coinName}
                coinLogo={coinLogo}
                isLoading={isLoading}
                coinBalance={coinBalance}
                isConnected={isConnected}
                warning={warning}
                errorDetail={errorDetail}
                setWarning={setWarning}
                isConfigLoading={isConfigLoading}
                isBalanceLoading={isBalanceLoading}
                onChange={(value) => {
                  setAddValue(value)
                }}
                coinNameComponent={
                  <Select
                    value={tokenType.toString()}
                    onValueChange={(value) => {
                      setAddValue("")
                      setTokenType(Number(value))
                    }}
                  >
                    <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit">
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
                  <div className="flex items-center justify-between w-full h-[24px] sm:h-[28px]">
                    <span>LP Position</span>
                    <span className="flex items-center gap-x-1 sm:gap-x-1.5">
                      {!addValue ? (
                        "--"
                      ) : isCalcLpLoading ? (
                        <Skeleton className="h-6 sm:h-7 w-36 sm:w-48 bg-[#2D2D48]" />
                      ) : !decimal ? (
                        "--"
                      ) : (
                        <>
                          {"≈  " + formatDecimalValue(lpAmount, decimal)} LP{" "}
                          {coinConfig?.coinName}
                          {coinConfig?.coinLogo && (
                            <img
                              src={coinConfig.coinLogo}
                              alt={coinConfig.coinName}
                              className="size-[24px] sm:size-[28px]"
                            />
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {(ytAmount ||
                    (isCalcLpLoading &&
                      marketStateData &&
                      new Decimal(marketStateData.totalSy)
                        .mul(0.4)
                        .lt(
                          new Decimal(addValue || "0")
                            .mul(10 ** (decimal || 0))
                            .toString(),
                        ))) && (
                    <div className="flex items-center justify-between w-full h-[24px] sm:h-[28px] text-xs sm:text-sm text-white/60">
                      <span>YT Receive</span>
                      <span className="flex items-center gap-x-1 sm:gap-x-1.5">
                        {!addValue ? (
                          "--"
                        ) : isCalcLpLoading ? (
                          <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 bg-[#2D2D48]" />
                        ) : !decimal ? (
                          "--"
                        ) : (
                          <>
                            {formatDecimalValue(ytAmount, decimal)} YT{" "}
                            {coinConfig?.coinName}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <hr className="border-t border-[#2D2D48] my-4 sm:my-6" />

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-x-1">
                    <span>Total APY</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-2.5 sm:size-3 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#20283C] rounded-md border-none">
                          <p className="text-xs sm:text-sm">
                            Total APY includes trading fees and farming rewards.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="underline text-xs sm:text-sm">
                    {ptYtData?.poolApy
                      ? `${Number(ptYtData.poolApy).toFixed(6)}%`
                      : "--"}
                  </span>
                </div>
              </div>

              <TradeInfo
                ratio={ratio}
                slippage={slippage}
                onRefresh={handleRefresh}
                isLoading={isLoading}
                setSlippage={setSlippage}
                isRatioLoading={isRatioLoading}
                coinName={
                  tokenType === 0
                    ? coinConfig?.underlyingCoinName
                    : coinConfig?.coinName
                }
                targetCoinName={`LP ${coinConfig?.coinName}`}
                tradeFee={lpFeeAmount}
              />

              <ActionButton
                onClick={add}
                btnText={btnText}
                disabled={btnDisabled}
                loading={isAdding || isCalcLpLoading}
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div>
          {/* Right Panel Header */}
          <div className="grid grid-cols-3 mb-3 sm:mb-4 lg:mb-5">
            <div className="text-center">
              <p className="text-sm sm:text-lg lg:text-xl font-normal">
                {ptYtData?.tvl
                  ? `$${formatDecimalValue(ptYtData?.tvl || 0, 2)}`
                  : "--"}
              </p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">TVL</p>
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-lg lg:text-xl font-normal">
                {dayjs(Number(coinConfig?.maturity ?? 0)).format("MMM DD YYYY")}
              </p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Maturity</p>
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-lg lg:text-xl font-normal">
                {ptYtData?.poolApy
                  ? `${Number(ptYtData.poolApy).toFixed(6)}%`
                  : "--"}
              </p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-white/60">Total APY</p>
            </div>
          </div>

          <div className="bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {/* Pool Capacity */}
              {isValidAmount(marketStateData?.marketCap) && (
                <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 relative">
                  <h3 className="text-base sm:text-lg lg:text-xl font-normal mb-4 sm:mb-6 lg:mb-8">
                    Pool Capacity
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isMarketStateDataLoading ? (
                          <Skeleton className="h-2 w-full bg-[#2D2D48]" />
                        ) : marketStateData ? (
                          <Progress
                            className="h-2 bg-[#2DF4DD] cursor-pointer"
                            indicatorClassName="bg-[#2C62D8]"
                            value={new Decimal(marketStateData.totalSy)
                              .div(marketStateData.marketCap)
                              .mul(100)
                              .toNumber()}
                          />
                        ) : (
                          <span>No data</span>
                        )}
                      </TooltipTrigger>

                      {/* Tooltip with bottom alignment and arrow */}
                      <TooltipContent
                        className="bg-[#12121B] border border-[#2D2D48] rounded-lg p-2 sm:p-3 text-xs sm:text-sm relative mb-2"
                        side="top"
                        align="end"
                        sideOffset={5}
                      >
                        <div className="text-white space-y-1">
                          <div>
                            Total Capacity:{" "}
                            {marketStateData?.marketCap && decimal
                              ? `${new Decimal(marketStateData.marketCap)
                                  .div(10 ** decimal)
                                  .toFixed(2)} ${coinConfig?.coinName}`
                              : "--"}
                          </div>
                          <div>
                            Filled:{" "}
                            {marketStateData
                              ? `${new Decimal(marketStateData.totalSy)
                                  .div(new Decimal(marketStateData.marketCap))
                                  .mul(100)
                                  .toFixed(2)}%`
                              : "--"}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Pool Ratio */}
              <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6">
                <h3 className="text-sm sm:text-lg lg:text-xl font-normal mb-4 sm:mb-6 lg:mb-8">
                  Pool Ratio
                </h3>
                <div className="mb-3 sm:mb-4 cursor-pointer">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="flex justify-between mb-3 sm:mb-4 text-xs sm:text-sm">
                            <span>
                              PT {coinConfig?.coinName} {ptRatio}%
                            </span>
                            <span>
                              {coinConfig?.coinName} {syRatio}%
                            </span>
                          </div>
                          <Progress
                            value={Number(ptRatio)}
                            className="h-2 bg-[#2DF4DD]"
                            indicatorClassName="bg-[#2C62D8]"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        className="bg-[#12121B] border border-[#2D2D48] rounded-lg p-2 sm:p-3 text-xs sm:text-sm relative mb-2"
                        side="top"
                        align="end"
                        sideOffset={5}
                      >
                        <div className="text-white space-y-1">
                          <div className="flex justify-between items-center gap-x-2 sm:gap-x-4">
                            <span>
                              {marketStateData?.totalPt && decimal
                                ? `${formatDecimalValue(
                                    new Decimal(marketStateData.totalPt).div(
                                      10 ** decimal,
                                    ),
                                    2,
                                  )} `
                                : "--"}
                              PT {coinConfig?.coinName}:
                            </span>
                            <span>
                              {ptYtData?.ptTvl
                                ? `$${formatDecimalValue(ptYtData.ptTvl, 2)}`
                                : "--"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-x-2 sm:gap-x-4">
                            <span>
                              {marketStateData?.totalSy && decimal
                                ? `${formatDecimalValue(
                                    new Decimal(marketStateData.totalSy).div(
                                      10 ** decimal,
                                    ),
                                    2,
                                  )} `
                                : "--"}
                              {coinConfig?.coinName}:
                            </span>
                            <span>
                              {ptYtData?.syTvl
                                ? `$${formatDecimalValue(ptYtData.syTvl, 2)}`
                                : "--"}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* APY Information */}
              <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-xl">Total APY</span>
                    <span className="text-base sm:text-xl text-white">
                      {ptYtData?.poolApy
                        ? `${Number(ptYtData.poolApy).toFixed(6)}%`
                        : "--"}
                    </span>
                  </div>
                  <div className="h-[1px] bg-[#2D2D48]" />
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex justify-between items-center text-white/60 text-xs sm:text-sm">
                      <span>Scaled Underlying APY</span>
                      <span>
                        {ptYtData?.scaledUnderlyingApy
                          ? `${new Decimal(ptYtData.scaledUnderlyingApy).toFixed(6)} %`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/60 text-xs sm:text-sm">
                      <span>Scaled PT APY</span>
                      <span>
                        {ptYtData?.scaledPtApy
                          ? `${new Decimal(ptYtData.scaledPtApy).toFixed(6)} %`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/60 text-xs sm:text-sm">
                      <span>Swap Fee APY</span>
                      <span>
                        {ptYtData?.swapFeeApy
                          ? `${new Decimal(ptYtData.swapFeeApy).toFixed(6)} %`
                          : "--"}
                      </span>
                    </div>
                    {ptYtData?.incentiveApy &&
                      isValidAmount(ptYtData.incentiveApy) && (
                        <div className="flex justify-between items-center text-white/60 text-xs sm:text-sm">
                          <span>Incentive APY</span>
                          <span>{`${new Decimal(ptYtData.incentiveApy).toFixed(6)} %`}</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
