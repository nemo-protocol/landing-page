import dayjs from "dayjs"
import Decimal from "decimal.js"
import { DEBUG, network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
import AmountInput from "@/components/AmountInput"
import ActionButton from "@/components/ActionButton"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Transaction } from "@mysten/sui/transactions"
import { parseErrorMessage, parseGasErrorMessage } from "@/lib/errorMapping"
import usePyPositionData from "@/hooks/usePyPositionData"
import { Info, ChevronsDown } from "lucide-react"
import { formatDecimalValue, safeDivide } from "@/lib/utils"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import {
  getPriceVoucher,
  initPyPosition,
  splitCoinHelper,
  mintSycoin,
  depositSyCoin,
} from "@/lib/txHelper"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
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
import TradeInfo from "@/components/TradeInfo"
import { debugLog } from "@/config"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useRatioLoadingState } from "@/hooks/useRatioLoadingState"

export default function Invest() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [swapValue, setSwapValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [openConnect, setOpenConnect] = useState(false)
  const [tokenType, setTokenType] = useState<number>(0) // 0-native coin, 1-wrapped coin
  const [status, setStatus] = useState<"Success" | "Failed">()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const { address } = useWallet()
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
    data: swapRatio,
    isFetching: isRatioFetching,
  } = useQuerySwapRatio(coinConfig?.marketStateId, "pt", "buy")

  const conversionRate = useMemo(() => swapRatio?.conversionRate, [swapRatio])

  const ratio = useMemo(() => {
    if (swapRatio) {
      if (tokenType === 0 && conversionRate && swapRatio.exchangeRate) {
        return new Decimal(swapRatio.exchangeRate)
          .div(safeDivide(conversionRate))
          .toString()
      } else {
        return swapRatio.exchangeRate
      }
    }
  }, [swapRatio, tokenType, conversionRate])

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const { isLoading } = useLoadingState(
    swapValue,
    isRatioFetching || isConfigLoading,
  )

  const { isLoading: isRatioLoading } = useRatioLoadingState(
    isRatioFetching || isConfigLoading,
  )

  const { data: coinData, isLoading: isBalanceLoading } = useCoinData(
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
    return 0
  }, [coinData, decimal])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(swapValue || 0),
    [coinBalance, swapValue],
  )

  async function swap() {
    if (
      ratio &&
      address &&
      coinType &&
      swapValue &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        await refetch()
        const tx = new Transaction()
        const swapAmount = new Decimal(swapValue)
          .mul(10 ** coinConfig.decimal)
          .toString()

        const [splitCoin] =
          tokenType === 0
            ? mintSycoin(tx, coinConfig, coinData, [swapAmount])
            : splitCoinHelper(tx, coinData, [swapAmount], coinType)

        const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType)

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::swap_exact_sy_for_pt`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.u64(
              new Decimal(swapValue)
                .mul(10 ** coinConfig.decimal)
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            syCoin,
            priceVoucher,
            pyPosition,
            tx.object(coinConfig.pyStateId),
            tx.object(coinConfig.marketFactoryConfigId),
            tx.object(coinConfig.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        debugLog("swap_exact_sy_for_pt move call:", {
          target: `${coinConfig.nemoContractId}::market::swap_exact_sy_for_pt`,
          arguments: [
            coinConfig.version,
            new Decimal(swapValue)
              .mul(10 ** coinConfig.decimal)
              .mul(1 - new Decimal(slippage).div(100).toNumber())
              .toFixed(0),
            "syCoin",
            "priceVoucher",
            "pyPosition",
            coinConfig.pyStateId,
            coinConfig.marketFactoryConfigId,
            coinConfig.marketStateId,
            "0x6",
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        // if (created) {
        //   tx.setGasBudget(0.2 * 1e9)
        // } else {
        //   tx.setGasBudget(0.05 * 1e9)
        // }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })

        setTxId(res.digest)
        // if (res.effects?.status.status === "failure") {
        //   setOpen(true)
        //   setStatus("Failed")
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
        setStatus("Success")
        setOpen(true)
        setSwapValue("")
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
          setMessage("Insufficient PT in the pool.")
        } else {
          setMessage(parseErrorMessage(msg || ""))
        }
      }
    }
  }

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <h2 className="text-center text-xl">Invest</h2>
        <div className="h-6">{isBalanceLoading}</div>
        {/* TODO: add global */}
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
          onChange={(value) => setSwapValue(value)}
          coinNameComponent={
            <Select
              value={tokenType.toString()}
              onValueChange={(value) => {
                setSwapValue("")
                setTokenType(Number(value))
              }}
            >
              <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base w-fit">
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
        <ChevronsDown className="size-6" />
        <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
          <div className="flex flex-col items-end gap-y-1">
            <div className="flex items-center justify-between w-full">
              <span>Receiving</span>
              <span className="h-[28px]">
                {!swapValue ? (
                  "--"
                ) : isLoading ? (
                  <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
                ) : !decimal || !ratio ? (
                  "--"
                ) : (
                  <span className="flex items-center gap-x-1.5">
                    {"≈  " +
                      formatDecimalValue(
                        new Decimal(swapValue).mul(ratio),
                        decimal,
                      )}{" "}
                    <span>PT {coinConfig?.coinName}</span>
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
            <span>Fixed APY</span>
            <span className="underline">
              {coinConfig?.ptApy ? `${new Decimal(coinConfig.ptApy).mul(100).toFixed(2)} %` : "--"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-6 h-[28px]">
            <span className="flex items-center gap-x-1">
              <span>Fixed Return</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 cursor-pointer" />
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
            ) : isLoading ? (
              <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
            ) : ratio && decimal && swapValue && conversionRate ? (
              <div className="flex items-center gap-x-1.5">
                <span>
                  + $
                  {formatDecimalValue(
                    new Decimal(swapValue)
                      .mul(ratio)
                      .minus(
                        tokenType === 0
                          ? new Decimal(swapValue)
                          : new Decimal(swapValue).mul(conversionRate),
                      ),
                    decimal,
                  )}
                </span>
                <span>{coinConfig?.underlyingCoinName}</span>
                <img
                  src={coinConfig?.underlyingCoinLogo}
                  alt={coinConfig?.underlyingCoinName}
                  className="size-[28px]"
                />
              </div>
            ) : (
              <span>--</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-white/60 text-xs">
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
              ) : isLoading ? (
                <Skeleton className="h-4 w-20 bg-[#2D2D48]" />
              ) : decimal && ratio && coinConfig?.underlyingPrice ? (
                `≈ $${formatDecimalValue(
                  new Decimal(swapValue)
                    .mul(ratio)
                    .minus(
                      tokenType === 0
                        ? new Decimal(swapValue)
                        : new Decimal(swapValue).div(conversionRate || 1),
                    )
                    .mul(coinConfig.underlyingPrice),
                  2,
                )}`
              ) : (
                "--"
              )}
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
          targetCoinName={`PT ${coinConfig?.coinName}`}
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
        />
        <ActionButton
          onClick={swap}
          btnText="Invest"
          openConnect={openConnect}
          setOpenConnect={setOpenConnect}
          insufficientBalance={insufficientBalance}
          disabled={["", undefined, "0"].includes(swapValue)}
        />
      </div>
    </div>
  )
}
