import React from "react"
import { cn } from "@/lib/utils"
import Decimal from "decimal.js"
import { LoaderCircle, Wallet } from "lucide-react"

interface AmountInputProps {
  price?: string
  amount: string
  decimal?: number
  coinName?: string
  coinLogo?: string
  isLoading: boolean
  className?: string
  isConnected: boolean
  coinBalance?: number | string
  onChange: (value: string) => void
  coinNameComponent: React.ReactNode
}

const formatDecimalValue = (value: Decimal, decimalPlaces: number): string => {
  return value.decimalPlaces() > decimalPlaces
    ? value.toFixed(decimalPlaces)
    : value.toString()
}

const AmountInput: React.FC<AmountInputProps> = ({
  price,
  amount,
  onChange,
  coinLogo,
  coinName,
  isLoading,
  className,
  decimal = 0,
  coinBalance,
  isConnected,
  coinNameComponent,
}) => {
  return (
    <div
      className={cn(
        "space-y-3.5 w-full rounded-lg border border-[#2D2D48] px-3 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
          {isLoading ? (
            <LoaderCircle className="animate-spin size-6 text-white/60" />
          ) : (
            <div className="flex items-center gap-x-4">
              <img src={coinLogo} alt={coinName} className="size-12" />
              <div>
                {coinNameComponent}
                <div
                  className="flex items-center gap-x-1 hover:cursor-pointer hover:underline"
                  onClick={() =>
                    isConnected &&
                    coinBalance &&
                    onChange(
                      formatDecimalValue(new Decimal(coinBalance), decimal),
                    )
                  }
                >
                  <Wallet className="size-3.5" />
                  {isConnected
                    ? `${coinBalance?.toLocaleString()} LP ${coinName}`
                    : "--"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grow">
          <input
            min={0}
            type="number"
            value={amount}
            placeholder={"0"}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="bg-transparent h-full outline-none grow text-right min-w-0 placeholder:text-3xl p-0 text-3xl font-bold w-full"
          />
          <div className="flex items-end">
            <span className="text-xs text-white/80 ml-auto">
              ${formatDecimalValue(new Decimal(price || 0).mul(amount || 0), 2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AmountInput
