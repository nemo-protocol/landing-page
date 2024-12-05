import dayjs from "dayjs"
import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Info, ChevronsDown, RotateCw } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { useCoinConfig, useQuerySwapRatio } from "@/queries"
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
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import useCoinData from "@/hooks/useCoinData"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { formatDecimalValue } from "@/lib/utils"
import { getPriceVoucher, initPyPosition } from "@/lib/txHelper"
import ActionButton from "@/components/ActionButton"
import AmountInput from "@/components/AmountInput"
import SlippageSetting from "@/components/SlippageSetting"

export default function Invest() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const currentAccount = useCurrentAccount()
  const [swapValue, setSwapValue] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [message, setMessage] = useState<string>()
  const [openConnect, setOpenConnect] = useState(false)
  const [tokenType, setTokenType] = useState<number>(1) // 0-native coin, 1-wrapped coin
  const [status, setStatus] = useState<"Success" | "Failed">()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading } = useCoinConfig(coinType, maturity)

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
  const ptPrice = useMemo(() => coinConfig?.ptPrice, [coinConfig])

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: swapRatio, refetch } = useQuerySwapRatio(
    coinConfig?.marketStateId,
    "pt",
    "buy",
  )

  const conversionRate = useMemo(() => swapRatio?.conversionRate, [swapRatio])

  const ratio = useMemo(() => {
    if (swapRatio) {
      if (tokenType === 0) {
        return new Decimal(swapRatio.exchangeRate)
          .mul(swapRatio.conversionRate)
          .toString()
      } else {
        return swapRatio.exchangeRate
      }
    }
  }, [swapRatio, tokenType])

  const { data: coinData } = useCoinData(address, coinType)
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(coinConfig?.decimal ?? 0)
    }
    return 0
  }, [coinData, coinConfig])

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

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [splitCoin] = tx.splitCoins(coinData[0].coinObjectId, [
          new Decimal(swapValue).mul(10 ** coinConfig.decimal).toString(),
        ])

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(swapValue)
                .mul(10 ** coinConfig.decimal)
                .div(new Decimal(ratio).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

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
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig.marketFactoryConfigId),
            tx.object(coinConfig.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: Transaction.from(tx),
          chain: `sui:${network}`,
        })

        setTxId(res.digest)
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setStatus("Success")
        setOpen(true)
        setSwapValue("")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  const [isSpinning, setIsSpinning] = useState(false)

  const handleClick = () => {
    setIsSpinning(true)
    const timer = setTimeout(() => {
      setIsSpinning(false)
      clearTimeout(timer)
    }, 1000)
    refetch()
  }

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <h2 className="text-center text-xl">Invest</h2>
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
          isConnected={isConnected}
          coinBalance={coinBalance}
          onChange={(value) => {
            setSwapValue(value)
          }}
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
          <div className="flex items-center justify-between">
            <span>Receiving</span>
            <span>
              {decimal && swapValue && ratio
                ? formatDecimalValue(new Decimal(swapValue).mul(ratio), decimal)
                : "--"}
            </span>
          </div>
          <hr className="border-t border-[#2D2D48] mt-6" />
          <div className="flex items-center justify-between mt-6">
            <span>Fixed APY</span>
            <span className="underline">{coinConfig?.ptApy ? `${coinConfig.ptApy} %` : "--"}</span>
          </div>
          <div className="flex items-center justify-between mt-6">
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
            <div className="flex items-center gap-x-1.5">
              <span>
                {ratio &&
                decimal &&
                ptPrice &&
                swapValue &&
                coinConfig?.underlyingPrice
                  ? `+ ${formatDecimalValue(
                      new Decimal(swapValue)
                        .mul(ratio)
                        .mul(ptPrice)
                        .minus(
                          (tokenType === 0
                            ? new Decimal(swapValue)
                            : new Decimal(swapValue).div(conversionRate || 1)
                          ).mul(coinConfig.underlyingPrice),
                        ),
                      decimal,
                    )}`
                  : "--"}
              </span>
              <img src={coinLogo} alt={coinName} className="size-[28px]" />
            </div>
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
              {decimal &&
              swapValue &&
              ratio &&
              ptPrice &&
              coinConfig?.underlyingPrice
                ? `≈ $${formatDecimalValue(
                    new Decimal(swapValue)
                      .mul(ratio)
                      .mul(ptPrice)
                      .minus(
                        (tokenType === 0
                          ? new Decimal(swapValue)
                          : new Decimal(swapValue).div(conversionRate || 1)
                        ).mul(coinConfig.underlyingPrice),
                      )
                      .mul(coinConfig.underlyingPrice),
                    2,
                  )}`
                : "--"}
            </span>
          </div>
        </div>
        <div className="border border-[#2D2D48] bg-[#181827] rounded-xl px-[18px] py-6 w-full text-sm flex flex-col gap-y-4">
          <div className="flex items-center justify-between text-white/60">
            <span>Price</span>
            <div className="flex items-center gap-x-1">
              <span>{`1 ${coinName} ≈ ${Number(ratio).toFixed(2)} PT ${coinName}`}</span>
              <RotateCw
                className={[
                  "size-5 cursor-pointer",
                  isSpinning && "animate-spin",
                ].join(" ")}
                onClick={() => handleClick()}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-white/60">
            <span>Trading Fees</span>
            <span>--</span>
          </div>
          <div className="flex items-center justify-between text-white/60">
            <span>Slippage</span>
            <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
          </div>
        </div>
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
