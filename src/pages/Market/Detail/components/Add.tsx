import dayjs from "dayjs"
import Decimal from "decimal.js"
import { useMemo, useState, useEffect, useCallback } from "react"
import useCoinData, { CoinData } from "@/hooks/useCoinData"
import TradeInfo from "@/components/TradeInfo"
import PoolSelect from "@/components/PoolSelect"
import { ChevronsDown, Info } from "lucide-react"
import AmountInput from "@/components/AmountInput"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DEBUG, network, debugLog } from "@/config"
import ActionButton from "@/components/ActionButton"
import { Transaction, TransactionArgument } from "@mysten/sui/transactions"
import { parseErrorMessage } from "@/lib/errorMapping"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { useParams, useNavigate } from "react-router-dom"
import { useLoadingState } from "@/hooks/useLoadingState"
import usePyPositionData from "@/hooks/usePyPositionData"
import { useCoinConfig } from "@/queries"
import useMarketStateData from "@/hooks/useMarketStateData"
import { formatDecimalValue, debounce } from "@/lib/utils"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { CoinConfig } from "@/queries/types/market"
import { useCalculateLpOut } from "@/hooks/useCalculateLpOut"
import {
  mintSycoin,
  initPyPosition,
  getPriceVoucher,
  splitCoinHelper,
  depositSyCoin,
  mintPy,
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
import { useAddLiquidityRatio } from "@/hooks/useAddLiquidityRatio"
import useFetchLpPosition from "@/hooks/useFetchLpPosition"

export default function SingleCoin() {
  const navigate = useNavigate()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState<number>(1)
  const [openConnect, setOpenConnect] = useState(false)
  const [lpPosition, setLpPosition] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading: isConfigLoading } = useCoinConfig(
    coinType,
    maturity,
    address,
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
      tokenType === 0 ? coinConfig?.underlyingPrice : coinConfig?.coinPrice,
    [tokenType, coinConfig],
  )

  const decimal = useMemo(() => coinConfig?.decimal, [coinConfig])

  const { mutateAsync: calculateLpOut, isPending: isLpAmountOutLoading } =
    useCalculateLpOut(coinConfig)

  const { data: marketStateData, isLoading: isMarketStateDataLoading } =
    useMarketStateData(coinConfig?.marketStateId)

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const { isLoading } = useLoadingState(
    addValue,
    isConfigLoading || isLpAmountOutLoading,
  )

  const { data: coinData, isLoading: isBalanceLoading } = useCoinData(
    address,
    tokenType === 0 ? coinConfig?.underlyingCoinType : coinType,
  )

  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(9)
    }
    return "0"
  }, [coinData, coinConfig])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  const [ptRatio, syRatio] = useMemo(() => {
    if (
      coinConfig?.ptTvl &&
      coinConfig?.syTvl &&
      !new Decimal(coinConfig.ptTvl).isZero() &&
      !new Decimal(coinConfig.syTvl).isZero()
    ) {
      const totalTvl = new Decimal(coinConfig.ptTvl).add(
        new Decimal(coinConfig.syTvl),
      )
      return [
        new Decimal(coinConfig.ptTvl).div(totalTvl).mul(100).toFixed(2),
        new Decimal(coinConfig.syTvl).div(totalTvl).mul(100).toFixed(2),
      ]
    }
    return ["0", "0"]
  }, [coinConfig])

  const totalApy = useMemo(() => {
    if (
      coinConfig?.underlyingApy &&
      coinConfig?.ptApy &&
      coinConfig?.swapFeeApy &&
      !isNaN(Number(syRatio)) &&
      !isNaN(Number(ptRatio))
    ) {
      const underlyingApyValue = new Decimal(coinConfig.underlyingApy).mul(
        syRatio,
      )
      const ptApyValue = new Decimal(coinConfig.ptApy).mul(ptRatio)
      const swapFeeApyValue = new Decimal(coinConfig.swapFeeApy).mul(100)

      const total = underlyingApyValue.add(ptApyValue).add(swapFeeApyValue)

      return total.isNaN() ? "--" : total.toFixed(2)
    }
    return "--"
  }, [coinConfig, syRatio, ptRatio])

  const {
    data: ratioData,
    refetch: refetchRatio,
    isFetching: isRatioFetching,
  } = useAddLiquidityRatio(coinConfig)

  const ratio = useMemo(() => ratioData?.ratio, [ratioData])
  const conversionRate = useMemo(() => ratioData?.conversionRate, [ratioData])

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isConfigLoading || isRatioFetching,
  )

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
        ? mintSycoin(tx, coinConfig, coinData, [addAmount])
        : splitCoinHelper(tx, coinData, [addAmount], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

    const [priceVoucher] = getPriceVoucher(tx, coinConfig)

    const seedLiquidityMoveCall = {
      target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
      arguments: [
        coinConfig.version,
        syCoin,
        tx.pure.u64(minLpAmount),
        priceVoucher,
        pyPosition,
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
        ? mintSycoin(tx, coinConfig, coinData, [amounts.sy, amounts.syForPt])
        : splitCoinHelper(tx, coinData, [amounts.sy, amounts.syForPt], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoinForSy, coinType)

    const pyCoin = depositSyCoin(tx, coinConfig, splitCoinForPt, coinType)
    const [priceVoucher] = getPriceVoucher(tx, coinConfig)
    const [pt_amount] = mintPy(tx, coinConfig, pyCoin, priceVoucher, pyPosition)

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
    const [lpPositions] = await fetchLpPositions()
    const mergedPosition = mergeAllLpPositions(tx, coinConfig, lpPositions, marketPosition)
    tx.transferObjects([yieldToken, mergedPosition], address)
  }

  async function handleAddLiquiditySingleSy(
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
        ? mintSycoin(tx, coinConfig, coinData, [addAmount])
        : splitCoinHelper(tx, coinData, [addAmount], coinType)

    const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

    const [priceVoucher] = getPriceVoucher(tx, coinConfig)

    const addLiquidityMoveCall = {
      target: `${coinConfig.nemoContractId}::router::add_liquidity_single_sy`,
      arguments: [
        coinConfig.version,
        syCoin,
        tx.pure.u64(minLpAmount),
        priceVoucher,
        pyPosition,
        coinConfig.pyStateId,
        coinConfig.marketFactoryConfigId,
        coinConfig.marketStateId,
        "0x6",
      ],
      typeArguments: [coinConfig.syCoinType],
    }
    debugLog("add_liquidity_single_sy move call:", addLiquidityMoveCall)

    const [mp] = tx.moveCall({
      ...addLiquidityMoveCall,
      arguments: [
        tx.object(coinConfig.version),
        syCoin,
        tx.pure.u64(minLpAmount),
        priceVoucher,
        pyPosition,
        tx.object(coinConfig.pyStateId),
        tx.object(coinConfig.marketFactoryConfigId),
        tx.object(coinConfig.marketStateId),
        tx.object("0x6"),
      ],
    })

    const [lpPositions] = await fetchLpPositions()
    const mergedPosition = mergeAllLpPositions(tx, coinConfig, lpPositions, mp)
    tx.transferObjects([mergedPosition], address)
  }

  async function add() {
    if (
      decimal &&
      address &&
      coinType &&
      slippage &&
      coinConfig &&
      conversionRate &&
      marketStateData &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        const addAmount = new Decimal(addValue)
          .div(tokenType === 0 ? conversionRate : 1)
          .mul(10 ** coinConfig.decimal)
          .toFixed(0)

        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const calculatedLpOut = await calculateLpOut(addAmount)

        const minLpAmount = new Decimal(calculatedLpOut.lpAmount)
          .mul(1 - new Decimal(slippage).div(100).toNumber())
          .toFixed(0)

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
          await handleAddLiquiditySingleSy(
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
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      } finally {
        setOpen(true)
      }
    }
  }

  const debouncedGetLpPosition = useCallback(
    (value: string, decimal: number, config: CoinConfig | undefined) => {
      const getLpPosition = debounce(async () => {
        if (value && value !== "0" && decimal && config && conversionRate) {
          try {
            const amount = new Decimal(value).mul(10 ** decimal).toString()
            const convertedAmount =
              tokenType === 0
                ? new Decimal(amount).div(conversionRate).toFixed(0)
                : amount
            const lpOut = await calculateLpOut(convertedAmount)
            setLpPosition(lpOut.lpAmount)
          } catch (error) {
            console.error("Failed to get LP position:", error)
          }
        } else {
          setLpPosition(undefined)
        }
      }, 500)
      getLpPosition()
      return getLpPosition.cancel
    },
    [calculateLpOut, tokenType, conversionRate],
  )

  useEffect(() => {
    const cancelFn = debouncedGetLpPosition(addValue, decimal ?? 0, coinConfig)
    return () => {
      cancelFn()
    }
  }, [addValue, decimal, coinConfig, debouncedGetLpPosition])

  const handleRefresh = useCallback(async () => {
    refetchRatio()
    if (addValue && decimal) {
      const amount = new Decimal(addValue).mul(10 ** decimal).toString()
      const lpOut = await calculateLpOut(amount)
      setLpPosition(lpOut.lpAmount)
    }
  }, [refetchRatio, addValue, decimal, calculateLpOut])

  return (
    <div className="w-full md:w-[500px] lg:w-full bg-[#0E0F16] rounded-[40px] p-4 lg:p-8 border border-white/[0.07]">
      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-8">
        {/* Left Panel */}
        <div className="space-y-4">
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
          <div className="bg-[#12121B] rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-white/[0.07]">
            <div className="flex flex-col items-center gap-y-4">
              <h2 className="text-center text-xl">Add Liquidity</h2>

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
                amount={addValue}
                coinName={coinName}
                coinLogo={coinLogo}
                isLoading={isLoading}
                coinBalance={coinBalance}
                isConnected={isConnected}
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
                    <span>LP Position</span>
                    <span className="flex items-center gap-x-1.5">
                      {!addValue ? (
                        "--"
                      ) : isLoading ? (
                        <Skeleton className="h-7 w-48 bg-[#2D2D48]" />
                      ) : !decimal ? (
                        "--"
                      ) : (
                        <>
                          {"≈  " + formatDecimalValue(lpPosition, decimal)} LP{" "}
                          {coinConfig?.coinName}
                          {coinConfig?.coinLogo && (
                            <img
                              src={coinConfig.coinLogo}
                              alt={coinConfig.coinName}
                              className="size-[28px]"
                            />
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <hr className="border-t border-[#2D2D48] my-6" />

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-x-1">
                    <span>Total APY</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#20283C] rounded-md border-none">
                          <p>
                            Total APY includes trading fees and farming rewards.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="underline">
                    {totalApy !== "--" ? `${totalApy} %` : "--"}
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
                coinName={coinConfig?.coinName}
                targetCoinName={`LP ${coinConfig?.coinName}`}
                tradeFee={
                  !!addValue &&
                  !!conversionRate &&
                  !!coinConfig?.feeRate &&
                  !!coinConfig?.coinPrice
                    ? new Decimal(coinConfig.feeRate)
                        .mul(
                          tokenType === 0
                            ? new Decimal(addValue).mul(conversionRate)
                            : addValue,
                        )
                        .mul(coinConfig.coinPrice)
                        .toString()
                    : undefined
                }
              />

              <ActionButton
                btnText={"Add"}
                onClick={add}
                openConnect={openConnect}
                setOpenConnect={setOpenConnect}
                insufficientBalance={insufficientBalance}
                disabled={
                  ["", undefined, "0"].includes(addValue) ||
                  new Decimal(addValue).toNumber() === 0
                }
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div>
          {/* Right Panel Header */}
          <div className="grid grid-cols-3 mb-4 lg:mb-5">
            <div className="text-center">
              <p className="text-lg lg:text-xl font-normal">
                {coinConfig?.tvl
                  ? `$${formatDecimalValue(coinConfig?.tvl || 0, 2)}`
                  : "--"}
              </p>
              <p className="text-xs lg:text-sm text-white/60">TVL</p>
            </div>
            <div className="text-center">
              <p className="text-lg lg:text-xl font-normal">
                {dayjs(parseInt(coinConfig?.maturity || "0")).format(
                  "MMM DD YYYY",
                )}
              </p>
              <p className="text-xs lg:text-sm text-white/60">Maturity</p>
            </div>
            <div className="text-center">
              <p className="text-lg lg:text-xl font-normal">
                {totalApy !== "--" ? `${totalApy}%` : "--"}
              </p>
              <p className="text-xs lg:text-sm text-white/60">Total APY</p>
            </div>
          </div>

          <div className="bg-[#12121B] rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-white/[0.07]">
            <div className="space-y-3 lg:space-y-4">
              {/* Pool Capacity */}
              <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-4 lg:p-6 relative">
                <h3 className="text-lg lg:text-xl font-normal mb-6 lg:mb-8">
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
                      className="bg-[#12121B] border border-[#2D2D48] rounded-lg p-3 text-sm relative mb-2"
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

              {/* Pool Ratio */}
              <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-normal mb-6 lg:mb-8">
                  Pool Ratio
                </h3>
                <div className="mb-4 cursor-pointer">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="flex justify-between mb-4">
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
                        className="bg-[#12121B] border border-[#2D2D48] rounded-lg p-3 text-sm relative mb-2"
                        side="top"
                        align="end"
                        sideOffset={5}
                      >
                        <div className="text-white space-y-1">
                          <div className="flex justify-between items-center gap-x-4">
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
                              {coinConfig?.ptTvl
                                ? `$${formatDecimalValue(coinConfig.ptTvl, 2)}`
                                : "--"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-x-4">
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
                              {coinConfig?.syTvl
                                ? `$${formatDecimalValue(coinConfig.syTvl, 2)}`
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
              <div className="border border-[#2D2D48] rounded-lg lg:rounded-xl p-4 lg:p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xl">Total APY</span>
                    <span className="text-xl text-white">
                      {totalApy !== "--" ? `${totalApy} %` : "--"}
                    </span>
                  </div>
                  <div className="h-[1px] bg-[#2D2D48]" />
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-white/60">
                      <span>Scaled Underlying APY</span>
                      <span>
                        {coinConfig?.underlyingApy
                          ? `${new Decimal(coinConfig.underlyingApy).mul(syRatio).toFixed(2)} %`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/60">
                      <span>Scaled PT APY</span>
                      <span>
                        {coinConfig?.ptApy
                          ? `${new Decimal(coinConfig.ptApy).mul(ptRatio).toFixed(2)} %`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/60">
                      <span>Swap Fee APY</span>
                      <span>
                        {coinConfig?.swapFeeApy
                          ? `${new Decimal(coinConfig.swapFeeApy).mul(100).toFixed(2)} %`
                          : "--"}
                      </span>
                    </div>
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
