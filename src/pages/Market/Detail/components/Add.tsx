import dayjs from "dayjs"
import Decimal from "decimal.js"
import { useMemo, useState } from "react"
import useCoinData from "@/hooks/useCoinData"
import TradeInfo from "@/components/TradeInfo"
import { ChevronsDown, Info } from "lucide-react"
import AmountInput from "@/components/AmountInput"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DEBUG, network, debugLog } from "@/config"
import ActionButton from "@/components/ActionButton"
import { Transaction } from "@mysten/sui/transactions"
import { parseErrorMessage } from "@/lib/errorMapping"
import { useWallet } from "@aricredemption/wallet-kit"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useParams, useNavigate } from "react-router-dom"
import usePyPositionData from "@/hooks/usePyPositionData"
import useMarketStateData from "@/hooks/useMarketStateData"
import { formatDecimalValue, safeDivide } from "@/lib/utils"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { useCoinConfig, useQueryLPRatio, useCoinInfoList } from "@/queries"
import {
  getPriceVoucher,
  initPyPosition,
  splitCoinHelper,
  swapScoin,
} from "@/lib/txHelper"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"

export default function SingleCoin() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()
  const [tokenType, setTokenType] = useState<number>(1)
  const [slippage, setSlippage] = useState("0.5")
  const { data: list } = useCoinInfoList()
  const [selectedPool, setSelectedPool] = useState("")
  const navigate = useNavigate()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading: isConfigLoading } = useCoinConfig(
    coinType,
    maturity,
    address,
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
      tokenType === 0 ? coinConfig?.underlyingPrice : coinConfig?.coinPrice,
    [tokenType, coinConfig],
  )

  const decimal = useMemo(() => coinConfig?.decimal, [coinConfig])

  const {
    refetch,
    data: dataRatio,
    isFetching: isRatioFetching,
  } = useQueryLPRatio(address, coinConfig?.marketStateId)

  const conversionRate = useMemo(() => dataRatio?.conversionRate, [dataRatio])

  const ratio = useMemo(() => {
    if (dataRatio) {
      if (tokenType === 0 && conversionRate && dataRatio.syLpRate) {
        return new Decimal(dataRatio.syLpRate)
          .div(safeDivide(conversionRate))
          .toString()
      } else {
        return dataRatio.syLpRate
      }
    }
  }, [dataRatio, tokenType, conversionRate])

  const { data: lpSupply } = useMarketStateData(coinConfig?.marketStateId)

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const { isLoading } = useLoadingState(
    addValue,
    isRatioFetching || isConfigLoading,
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
    return 0
  }, [coinData, coinConfig])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  const [ptRatio, syRatio] = useMemo(() => {
    if (coinConfig?.ptTvl && coinConfig?.syTvl) {
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
      coinConfig?.swapFeeApy
    ) {
      return new Decimal(coinConfig.underlyingApy)
        .mul(syRatio)
        .add(new Decimal(coinConfig.ptApy).mul(ptRatio))
        .add(new Decimal(coinConfig.swapFeeApy).mul(100))
        .toFixed(2)
    }
    return "--"
  }, [coinConfig, syRatio, ptRatio])

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isRatioFetching || isConfigLoading
  )

  async function add() {
    if (
      ratio &&
      address &&
      coinType &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        await refetch()
        const tx = new Transaction()

        const splitCoin =
          tokenType === 0
            ? swapScoin(tx, coinConfig, coinData, addValue)
            : splitCoinHelper(
                tx,
                coinData,
                new Decimal(addValue).mul(10 ** coinConfig.decimal).toString(),
                coinType,
              )

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const depositMoveCall = {
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            coinConfig.version,
            "splitCoinForAdd",
            new Decimal(addValue).mul(10 ** coinConfig.decimal).toFixed(0),
            coinConfig.syStateId,
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        }
        debugLog("sy::deposit move call:", depositMoveCall)

        const [syCoin] = tx.moveCall({
          ...depositMoveCall,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(10 ** coinConfig.decimal)
                .mul(ratio || 1)
                .div(new Decimal(ratio).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
        })

        const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

        if (lpSupply === "" || lpSupply === "0") {
          const seedLiquidityMoveCall = {
            target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
            arguments: [
              coinConfig.version,
              "syCoin",
              "priceVoucherForMintLp",
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
              priceVoucherForMintLp,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig!.marketStateId),
              tx.object("0x6"),
            ],
          })

          tx.transferObjects([lp], address)
        } else {
          const addLiquidityMoveCall = {
            target: `${coinConfig.nemoContractId}::market::add_liquidity_single_sy`,
            arguments: [
              coinConfig.version,
              "syCoin",
              //FIXME: we should calculate the min out correctly
              new Decimal(0).toFixed(0),
              "priceVoucherForMintLp",
              "pyPosition",
              coinConfig.pyStateId,
              coinConfig.yieldFactoryConfigId,
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
              //FIXME: we should calculate the min out correctly
              tx.pure.u64(new Decimal(0).toFixed(0)),
              priceVoucherForMintLp,
              pyPosition,
              tx.object(coinConfig.pyStateId),
              tx.object(coinConfig.yieldFactoryConfigId),
              tx.object(coinConfig.marketFactoryConfigId),
              tx.object(coinConfig.marketStateId),
              tx.object("0x6"),
            ],
          })

          tx.transferObjects([mp], address)
        }

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        setTxId(res.digest)
        //TODO : handle error
        // if (res.effects?.status.status === "failure") {
        //   setStatus("Failed")
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
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

  return (
    <div className="w-full md:w-[500px] lg:w-full bg-[#0E0F16] rounded-[40px] p-4 lg:p-8 border border-white/[0.07]">
      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-8">
        {/* 左侧面板 */}
        <div>
          {/* 左侧标题 */}
          <div className="mb-4 lg:mb-5">
            <Select
              value={selectedPool}
              onValueChange={(item) => {
                setSelectedPool(item)
                const [coinAddress, maturity] = item.split("-")
                navigate(`/market/detail/${coinAddress}/${maturity}/add`, {
                  replace: true,
                })
              }}
            >
              <SelectTrigger className="w-full text-wrap border-none bg-[#131520] h-auto p-3 rounded-2xl">
                <div className="flex items-center gap-x-3">
                  <img
                    src={coinConfig?.coinLogo}
                    alt={coinConfig?.coinName}
                    className="size-8 lg:size-10"
                  />
                  <h2 className="text-lg lg:text-xl font-normal text-left">
                    {coinConfig?.coinName || "Select a pool"}
                    {coinConfig?.maturity &&
                      ` - ${dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")}`}
                  </h2>
                </div>
              </SelectTrigger>
              <SelectContent className="border-none bg-[#131520]">
                <SelectGroup className="flex flex-col gap-y-2">
                  {list?.map((item) => (
                    <SelectItem
                      className="flex items-center justify-between hover:bg-[#0E0F16] cursor-pointer py-4 rounded-md"
                      key={item.coinAddress + "-" + item.maturity}
                      value={item.coinAddress + "-" + item.maturity}
                    >
                      {item.coinName}-
                      {dayjs(parseInt(item.maturity)).diff(dayjs(), "day")}DAYS
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Add Liquidity 面板 */}
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
                      ) : !decimal || !ratio ? (
                        "--"
                      ) : (
                        <>
                          {"≈  " +
                            formatDecimalValue(
                              new Decimal(addValue).mul(ratio),
                              decimal,
                            )}{" "}
                          LP {coinConfig?.coinName}
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
                coinName={coinName}
                slippage={slippage}
                onRefresh={refetch}
                isLoading={isLoading}
                setSlippage={setSlippage}
                isRatioLoading={isRatioLoading}
                targetCoinName={`LP ${coinConfig?.coinName}`}
                tradeFee={
                  !!addValue && !!coinConfig?.feeRate && !!price
                    ? new Decimal(coinConfig.feeRate)
                        .mul(addValue)
                        .mul(price)
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

        {/* 右侧面板 */}
        <div>
          {/* 右侧顶部信息 */}
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
                {coinConfig?.poolApy ? `${coinConfig.poolApy}%` : "--"}
              </p>
              <p className="text-xs lg:text-sm text-white/60">Pool Apy</p>
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
                      <div>
                        {coinConfig?.cap &&
                        coinConfig?.tvl &&
                        coinConfig?.decimal &&
                        price ? (
                          <Progress
                            value={new Decimal(coinConfig.tvl)
                              .div(
                                new Decimal(coinConfig.cap)
                                  .div(10 ** Number(coinConfig.decimal))
                                  .mul(price),
                              )
                              .mul(100)
                              .toNumber()}
                            className="h-2 bg-[#2D2D48]"
                            indicatorClassName="bg-[#2DF4DD]"
                          />
                        ) : (
                          <Progress
                            value={0}
                            className="h-2 bg-[#2D2D48]"
                            indicatorClassName="bg-[#2DF4DD]"
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      className="bg-[#1B2341] border-none rounded-lg p-2 text-sm"
                      side="top"
                      align="end"
                    >
                      <div className="text-white/60">
                        <div>
                          Total Capacity:{" "}
                          {coinConfig?.cap && coinConfig.decimal
                            ? new Decimal(coinConfig.cap)
                                .div(10 ** Number(coinConfig.decimal))
                                .toFixed(2)
                            : "--"}{" "}
                          {coinConfig?.coinName}
                        </div>
                        <div>
                          Filled:{" "}
                          {coinConfig?.cap &&
                          coinConfig?.tvl &&
                          coinConfig?.decimal &&
                          price
                            ? new Decimal(coinConfig.tvl)
                                .div(
                                  new Decimal(coinConfig.cap)
                                    .div(10 ** Number(coinConfig.decimal))
                                    .mul(price),
                                )
                                .mul(100)
                                .toFixed(2)
                            : "--"}
                          %
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
                <div className="mb-4">
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
