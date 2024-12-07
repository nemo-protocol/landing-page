import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { ChevronsDown, RotateCw } from "lucide-react"
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

export default function Trade() {
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

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: swapRatio, refetch } = useQuerySwapRatio(
    coinConfig?.marketStateId,
    "yt",
    "buy",
  )

  const ratio = useMemo(() => {
    if (swapRatio) {
      if (tokenType === 0) {
        return new Decimal(swapRatio.exchangeRate)
          .div(swapRatio.conversionRate)
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
      coinType &&
      address &&
      swapValue &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
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
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const [sy] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::swap_sy_for_exact_yt`,
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
            tx.object(coinConfig.syStateId),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig.marketFactoryConfigId),
            tx.object(coinConfig.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })
        // tx.transferObjects([sy], address)
        const [sCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::redeem`,
          arguments: [
            tx.object(coinConfig.version),
            sy,
            tx.pure.u64(
              new Decimal(swapValue)
                .div(ratio || 0)
                .mul(10 ** coinConfig.decimal)
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        tx.transferObjects([sCoin], address)

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
    <div className="w-full flex flex-col xl:flex-row gap-5">
      <div className="w-full xl:w-[500px] bg-[#12121B] rounded-3xl p-6 border border-white/[0.07] shrink-0">
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
            <div className="flex items-center justify-between">
              <span>Receiving</span>
              <span>
                {decimal && swapValue && ratio
                  ? formatDecimalValue(
                      new Decimal(swapValue).mul(ratio),
                      decimal,
                    )
                  : "--"}
              </span>
            </div>
            <hr className="border-t border-[#2D2D48] mt-6" />
            <div className="flex items-center justify-between mt-6">
              <span>Long YieldY</span>
              <span className="underline">
                {coinConfig?.ytApy ? `${coinConfig.ytApy} %` : "--"}
              </span>
            </div>
          </div>
          <div className="border border-[#2D2D48] bg-[#181827] rounded-xl px-[18px] py-6 w-full text-sm flex flex-col gap-y-4">
            <div className="flex items-center justify-between text-white/60">
              <span>Price</span>
              <div className="flex items-center gap-x-1">
                <span>{`1 ${coinName} ≈ ${Number(ratio).toFixed(2)} YT ${coinName}`}</span>
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
            btnText="Buy"
            openConnect={openConnect}
            setOpenConnect={setOpenConnect}
            insufficientBalance={insufficientBalance}
            disabled={["", undefined, "0"].includes(swapValue)}
          />
        </div>
      </div>
      <div className="grow space-y-5 bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
        <h3>HOW YT WORKS</h3>
        <div className="border border-[#2D2D48] px-[29px] py-[35px] flex items-center gap-x-4 rounded-xl">
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
              <span className="text-xs text-white/80">
                1 {coinConfig?.underlyingCoinName} in{" "}
                {coinConfig?.underlyingProtocol}
              </span>
            </div>
          </div>
          <svg
            width="2"
            height="93"
            viewBox="0 0 2 93"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 3.05176e-05L0.999996 93"
              stroke="#3A3A60"
              stroke-dasharray="2 2"
            />
          </svg>
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
            <div className="text-[#2DF4DD] text-xs">{coinConfig?.ytApy}</div>
          </div>
          <div className="flex flex-col items-start py-4 pl-[22px] gap-2.5">
            <div className="text-white/60 text-xs">7D Avg. Underlying APY</div>
            <div className="text-[#2DF4DD] text-xs">--</div>
          </div>
        </div>
      </div>
    </div>
  )
}
