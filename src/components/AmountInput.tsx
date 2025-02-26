import React from "react"
import { cn, formatDecimalValue } from "@/lib/utils"
import Decimal from "decimal.js"
import { Info, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import dayjs from "dayjs"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip"

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
  maturity?: string
  errorDetail?: string
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
  maturity,
  errorDetail,
}: AmountInputProps) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "rounded-lg border border-[#2D2D48] px-2 sm:px-3 py-3 sm:py-4",
          className,
        )}
      >
        <div className="flex items-center justify-between h-auto sm:h-12">
          <div className="flex items-center rounded-xl gap-x-1 sm:gap-x-2 bg-[#0E0F16] shrink-0">
            <div className="flex items-center gap-x-2 sm:gap-x-4">
              {isConfigLoading ? (
                <Skeleton className="size-8 sm:size-12 rounded-full bg-[#2D2D48]" />
              ) : (
                <img src={coinLogo} alt={coinName} className="size-8 sm:size-12" />
              )}

              <div className="space-y-0.5 sm:space-y-1">
                <div className="h-5 sm:h-6 flex items-center gap-x-1 sm:gap-x-2">
                  {isConfigLoading ? (
                    <Skeleton className="h-full w-10 sm:w-12 bg-[#2D2D48]" />
                  ) : (
                    coinNameComponent
                  )}
                  {maturity && (
                    <span className="text-xs sm:text-sm text-white/60">
                      {dayjs(parseInt(maturity)).format("DD MMM YYYY")}
                    </span>
                  )}
                </div>
                <div>
                  {isBalanceLoading || isConfigLoading ? (
                    <Skeleton className="h-3 sm:h-4 w-28 sm:w-40 bg-[#2D2D48]" />
                  ) : (
                    <button
                      disabled={disabled}
                      className={cn(
                        "flex items-center gap-x-1 text-xs sm:text-sm",
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
                      <Wallet className="size-3 sm:size-3.5" />
                      {isConnected
                        ? `${formatDecimalValue(coinBalance, decimal)} ${coinName}`
                        : "--"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grow space-y-0.5 sm:space-y-1 ml-2 sm:ml-0">
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
                "bg-transparent outline-none grow text-right min-w-0 placeholder:text-xl sm:placeholder:text-3xl p-0 text-xl sm:text-3xl font-bold w-full",
                disabled && "cursor-not-allowed",
              )}
            />
            <div className="flex items-end">
              {amount ? (
                isLoading ? (
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 ml-auto bg-[#2D2D48]" />
                ) : (
                  <span className="text-[10px] sm:text-xs text-white/80 ml-auto">
                    $
                    {formatDecimalValue(new Decimal(price || 0).mul(amount), 6)}
                  </span>
                )
              ) : (
                <span className="text-[10px] sm:text-xs text-white/80 ml-auto">$0</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="space-x-1 mt-1 sm:mt-2">
          <span className="text-xs sm:text-sm text-red-500 break-words">{error}</span>
          {errorDetail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3 sm:size-3.5 text-red-500" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#0E0F16] text-white text-xs sm:text-sm w-[280px] sm:w-[500px]">
                  <p>{errorDetail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      {warning && (
        <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-yellow-500 break-words">
          {warning}
        </div>
      )}
    </div>
  )
}
