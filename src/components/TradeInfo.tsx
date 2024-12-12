import { RotateCw } from "lucide-react"
import { useState } from "react"
import SlippageSetting from "./SlippageSetting"

interface TradeInfoProps {
  ratio?: string
  coinName?: string
  targetCoinName?: string
  tradeFee?: string
  tradeFeeSymbol?: string
  slippage: string
  setSlippage: (value: string) => void
  onRefresh?: () => void
}

export default function TradeInfo({
  ratio,
  coinName,
  targetCoinName,
  tradeFee,
  tradeFeeSymbol,
  slippage,
  setSlippage,
  onRefresh,
}: TradeInfoProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  const handleClick = () => {
    setIsSpinning(true)
    const timer = setTimeout(() => {
      setIsSpinning(false)
      clearTimeout(timer)
    }, 1000)
    onRefresh?.()
  }

  return (
    <div className="border border-[#2D2D48] bg-[#181827] rounded-xl px-[18px] py-6 w-full text-sm flex flex-col gap-y-4">
      <div className="flex items-center justify-between text-white/60">
        <span>Price</span>
        <div className="flex items-center gap-x-1">
          <span title={`1 ${coinName} ≈ ${ratio} ${targetCoinName}`}>
            {`1 ${coinName} ≈ ${Number(ratio || 0).toFixed(2)} ${targetCoinName}`}
          </span>
          <RotateCw
            className={["size-5 cursor-pointer", isSpinning && "animate-spin"].join(
              " ",
            )}
            onClick={handleClick}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-white/60">
        <span>Trading Fees</span>
        <span>
          {tradeFee ? `$ ${tradeFee} ${tradeFeeSymbol}` : "--"}
        </span>
      </div>
      <div className="flex items-center justify-between text-white/60">
        <span>Slippage</span>
        <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
      </div>
    </div>
  )
} 