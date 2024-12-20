import dayjs from "dayjs"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useCoinInfoList } from "@/queries"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

interface PoolSelectProps {
  coinType?: string
  maturity?: string
  className?: string
  onChange?: (coinType: string, maturity: string) => void
}

export default function PoolSelect({
  coinType,
  maturity,
  className,
  onChange,
}: PoolSelectProps) {
  const { data: list } = useCoinInfoList()

  const value = useMemo(() => 
    coinType && maturity ? `${coinType}-${maturity}` : "", 
    [coinType, maturity]
  )

  const selectedPool = useMemo(() => {
    return list?.find(item => 
      item.coinAddress === coinType && item.maturity === maturity
    )
  }, [list, coinType, maturity])

  const displayName = useMemo(() => {
    if (selectedPool) {
      return `${selectedPool.coinName} - ${
        dayjs(parseInt(maturity!)).diff(dayjs(), "day") > 0
          ? `${dayjs(parseInt(maturity!)).diff(dayjs(), "day")} DAYS`
          : "END"
      }`
    }
    return "Select a pool"
  }, [selectedPool, maturity])

  return (
    <Select
      value={value}
      onValueChange={(item) => {
        const [coinAddress, maturity] = item.split("-")
        if (onChange) {
          onChange(coinAddress, maturity)
        }
      }}
    >
      <SelectTrigger
        className={cn(
          "w-full text-wrap border-none bg-[#131520] h-16 p-3 rounded-2xl",
          className
        )}
      >
        <div className="flex items-center gap-x-3">
          {selectedPool?.coinLogo && (
            <img src={selectedPool.coinLogo} alt={selectedPool.coinName} className="size-8 lg:size-10" />
          )}
          <h2 className="text-lg lg:text-xl font-normal text-left">
            {displayName}
          </h2>
        </div>
      </SelectTrigger>
      <SelectContent className="border-none bg-[#131520]">
        <SelectGroup className="flex flex-col gap-y-2">
          {list?.map((item) => (
            <SelectItem
              className="flex items-center justify-between hover:bg-[#0E0F16] cursor-pointer py-4 rounded-md"
              key={item.coinAddress + "-" + item.maturity}
              value={item.coinAddress + "-" + item.maturity}
            >
              <div className="flex items-center gap-x-3">
                <img 
                  src={item.coinLogo} 
                  alt={item.coinName} 
                  className="size-8"
                />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {item.coinName} - {
                      dayjs(parseInt(item.maturity)).diff(dayjs(), "day") > 0 
                        ? `${dayjs(parseInt(item.maturity)).diff(dayjs(), "day")} DAYS`
                        : "END"
                    }
                  </span>
                  <span className="text-xs text-gray-400">
                    {dayjs(parseInt(item.maturity)).format("DD MMM YYYY")}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
