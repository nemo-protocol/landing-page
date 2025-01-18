import React from "react"
import { cn, formatDecimalValue } from "@/lib/utils"
import Decimal from "decimal.js"
import { Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AmountInputProps {
  price?: string
  error?: string
  warning?: string
  amount: string
  decimal?: number
  coinName?: string
  coinLogo?: string
  className?: string
  isLoading?: boolean
  coinBalance?: string
  isConnected?: boolean
  isConfigLoading?: boolean
  isBalanceLoading?: boolean
  onChange: (value: string) => void
  setWarning: (value: string) => void
  coinNameComponent?: React.ReactNode
  disabled?: boolean
}

export default function AmountInput({
  price,
  error,
  warning,
  amount,
  decimal = 0,
  coinName,
  coinLogo,
  isLoading,
  coinBalance,
  isConnected,
  coinNameComponent,
  isConfigLoading,
  isBalanceLoading,
  className,
  onChange,
  setWarning,
  disabled,
}: AmountInputProps) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "rounded-lg border border-[#2D2D48] px-3 py-4",
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
                    <button
                      disabled={disabled}
                      className={cn(
                        "flex items-center gap-x-1",
                        disabled
                          ? "cursor-not-allowed "
                          : " cursor-pointer hover:underline",
                      )}
                      onClick={() => {
                        if (isConnected && coinBalance) {
                          let adjustedBalance = new Decimal(coinBalance)
                          // TODO: better way to handle this
                          if (coinName === "SUI") {
                            if (adjustedBalance.lt(0.1)) {
                              setWarning(
                                "Insufficient SUI for gas fee. Minimum required: 0.1 SUI",
                              )
                              return
                            }
                            adjustedBalance = adjustedBalance.minus(0.1)
                          }
                          onChange(formatDecimalValue(adjustedBalance, decimal))
                        }
                      }}
                    >
                      <Wallet className="size-3.5" />
                      {isConnected
                        ? `${formatDecimalValue(coinBalance, decimal)} ${coinName}`
                        : "--"}
                    </button>
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
              disabled={disabled}
              onChange={(e) => onChange && onChange(e.target.value)}
              onWheel={(e) =>
                e.target instanceof HTMLElement && e.target.blur()
              }
              className={cn(
                "bg-transparent outline-none grow text-right min-w-0 placeholder:text-3xl p-0 text-3xl font-bold w-full",
                disabled && "cursor-not-allowed",
              )}
            />
            <div className="flex items-end">
              {amount ? (
                isLoading ? (
                  <Skeleton className="h-4 w-20 ml-auto bg-[#2D2D48]" />
                ) : (
                  <span className="text-xs text-white/80 ml-auto">
                    $
                    {formatDecimalValue(new Decimal(price || 0).mul(amount), 2)}
                  </span>
                )
              ) : (
                <span className="text-xs text-white/80 ml-auto">$0</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-500 break-words">{error}</div>
      )}
      {warning && (
        <div className="mt-2 text-sm text-yellow-500 break-words">
          {warning}
        </div>
      )}
    </div>
  )
}
