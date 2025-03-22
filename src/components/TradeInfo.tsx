import { Skeleton } from "@/components/ui/skeleton"
import SlippageSetting from "./SlippageSetting"
import RefreshButton from "./RefreshButton"

interface TradeInfoProps {
  ratio?: string | React.ReactNode
  coinName?: string
  targetCoinName?: string
  tradeFee?: string | React.ReactNode
  tradeFeeSymbol?: string
  slippage: string
  setSlippage: (value: string) => void
  onRefresh?: () => void
  isLoading?: boolean
  isRatioLoading?: boolean
}

export default function TradeInfo({
  ratio,
  coinName,
  targetCoinName,
  tradeFee,
  tradeFeeSymbol = "",
  slippage,
  setSlippage,
  onRefresh,
  isLoading,
  isRatioLoading,
}: TradeInfoProps) {
  return (
    <div className="border border-[#2D2D48] bg-[#181827] rounded-xl px-[18px] py-6 w-full text-sm flex flex-col gap-y-4">
      <div className="flex items-center justify-between text-white/60 gap-x-4">
        <span>Price</span>
        <div className="flex items-center gap-x-1">
          {isRatioLoading ? (
            <Skeleton className="h-5 w-56 bg-[#2D2D48]" />
          ) : (
            <span title={`1 ${coinName} ≈ ${ratio} ${targetCoinName}`}>
              {`1 ${coinName} ≈ ${Number(ratio || 0).toFixed(4)} ${targetCoinName}`}
            </span>
          )}
          {onRefresh && <RefreshButton onRefresh={onRefresh} size={20} />}
        </div>
      </div>
      <div className="flex items-center justify-between text-white/60">
        <span>Trading Fees</span>
        {!tradeFee ? (
          "--"
        ) : isLoading ? (
          <Skeleton className="h-5 w-24 bg-[#2D2D48]" />
        ) : (
          <span title={`$${tradeFee} ${tradeFeeSymbol}`}>
            {tradeFee
              ? `≈ $${Number(tradeFee).toFixed(10)} ${tradeFeeSymbol}`
              : "--"}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-white/60">
        <span>Slippage</span>
        <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
      </div>
    </div>
  )
}
