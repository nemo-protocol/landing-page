import React from "react"
import { cn } from "@/lib/utils"
import Decimal from "decimal.js"
import { Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AmountInputProps {
  price?: string
  amount: string
  decimal?: number
  coinName?: string
  coinLogo?: string
  isLoading: boolean
  className?: string
  isConnected: boolean
  isConfigLoading: boolean
  isBalanceLoading: boolean
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
  isConfigLoading,
  isBalanceLoading,
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
          <div className="flex items-center gap-x-4">
            {isConfigLoading ? (
              <Skeleton className="size-12 rounded-full bg-[#2D2D48]" />
            ) : (
              <img src={coinLogo} alt={coinName} className="size-12" />
            )}

            <div className="space-y-1">
              <div className="h-6">
                {isConfigLoading ? (
                  <Skeleton className="h-full w-12 bg-[#2D2D48]" />
                ) : (
                  coinNameComponent
                )}
              </div>
              <div>
                {isBalanceLoading || isConfigLoading ? (
                  <Skeleton className="h-4 w-40 bg-[#2D2D48]" />
                ) : (
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
                      ? `${Number(coinBalance).toFixed(decimal)} ${coinName}`
                      : "--"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grow space-y-1">
          <input
            min={0}
            type="number"
            value={amount}
            placeholder={"0"}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="bg-transparent outline-none grow text-right min-w-0 placeholder:text-3xl p-0 text-3xl font-bold w-full"
          />
          <div className="flex items-end">
            {amount ? (
              isLoading ? (
                <Skeleton className="h-4 w-20 ml-auto bg-[#2D2D48]" />
              ) : (
                <span className="text-xs text-white/80 ml-auto">
                  ${formatDecimalValue(new Decimal(price || 0).mul(amount), 2)}
                </span>
              )
            ) : (
              <span className="text-xs text-white/80 ml-auto">$0</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AmountInput
