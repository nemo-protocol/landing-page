import React from "react"
import { LoaderCircle } from "lucide-react"
import Decimal from "decimal.js"
import { CoinConfig } from "@/queries/types/market"

interface BalanceInputProps {
  price?: string
  balance: string
  showPrice: boolean
  isLoading: boolean
  isConnected: boolean
  coinConfig?: CoinConfig
  coinBalance?: number | string
  coinNameComponent: React.ReactNode
  setBalance?: (value: string) => void
}

const formatDecimalValue = (value: Decimal, decimalPlaces: number): string => {
  return value.decimalPlaces() > decimalPlaces
    ? value.toFixed(decimalPlaces)
    : value.toString()
}

const BalanceInput: React.FC<BalanceInputProps> = ({
  price,
  balance,
  showPrice,
  isLoading,
  coinConfig,
  setBalance,
  coinBalance,
  isConnected,
  coinNameComponent,
}) => {
  return (
    <div className="space-y-3.5 w-full">
      <div className="bg-black py-4 px-3 rounded-xl w-full">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            {isLoading ? (
              <LoaderCircle className="animate-spin size-6 text-white/60" />
            ) : (
              <>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-6"
                />
                {coinNameComponent}
              </>
            )}
          </div>
          <input
            min={0}
            type="number"
            value={balance}
            placeholder={"0"}
            disabled={!setBalance}
            onChange={(e) => setBalance && setBalance(e.target.value)}
            className="bg-transparent h-full outline-none grow text-right min-w-0 placeholder:text-3xl p-0 text-3xl font-bold"
          />
        </div>
        {showPrice && (
          <div className="flex items-end">
            <span className="text-xs text-white/80 ml-auto">
              $
              {formatDecimalValue(new Decimal(price || 0).mul(balance || 0), 2)}
            </span>
          </div>
        )}
      </div>
      {isConnected && !!coinBalance && setBalance && !isLoading && (
        <div className="flex items-center gap-x-2 justify-end w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setBalance(
                formatDecimalValue(
                  new Decimal(coinBalance).div(2),
                  coinConfig?.decimal || 0,
                ),
              )
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setBalance(
                formatDecimalValue(
                  new Decimal(coinBalance),
                  coinConfig?.decimal || 0,
                ),
              )
            }
          >
            Max
          </button>
        </div>
      )}
    </div>
  )
}

export default BalanceInput
