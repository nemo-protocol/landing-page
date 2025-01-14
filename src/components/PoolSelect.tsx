import dayjs from "dayjs"
import { useMemo } from "react"
import { cn, formatTimeDiff } from "@/lib/utils"
import { useCoinInfoList } from "@/queries"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface PoolSelectProps {
  coinType?: string
  maturity?: string
  className?: string
  onChange?: (coinType: string, maturity: string) => void
  filterExpired?: boolean
}

export default function PoolSelect({
  coinType,
  maturity,
  className,
  onChange,
  filterExpired = true,
}: PoolSelectProps) {
  const { data: list, isLoading } = useCoinInfoList({
    isShowExpiry: 1,
    isCalc: false,
  })

  const value = useMemo(
    () => (coinType && maturity ? `${coinType}-${maturity}` : ""),
    [coinType, maturity],
  )

  const selectedPool = useMemo(() => {
    return list?.find(
      (item) => item.coinType === coinType && item.maturity === maturity,
    )
  }, [list, coinType, maturity])

  const displayName = useMemo(() => {
    if (selectedPool) {
      return `${selectedPool.coinName} - ${formatTimeDiff(parseInt(maturity || "0"))}`
    }
    return "Select a pool"
  }, [selectedPool, maturity])

  const filteredList = useMemo(() => {
    if (!list) return []
    return list.filter((coin) => {
      const matchesExpiry = filterExpired
        ? parseInt(coin.maturity) > Date.now()
        : true
      return matchesExpiry
    })
  }, [list, filterExpired])

  return (
    <Select
      value={value}
      disabled={isLoading}
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
          isLoading && "opacity-100",
          className,
        )}
      >
        <div className="flex items-center gap-x-3">
          {isLoading ? (
            <>
              <Skeleton className="size-8 lg:size-10 rounded-full bg-white/[0.08]" />
              <Skeleton className="h-7 w-40 bg-white/[0.08]" />
            </>
          ) : (
            <>
              {selectedPool?.coinLogo && (
                <img
                  src={selectedPool.coinLogo}
                  alt={selectedPool.coinName}
                  className="size-8 lg:size-10"
                />
              )}
              <h2 className="text-lg lg:text-xl font-normal text-left">
                {displayName}
              </h2>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="border-none bg-[#131520] relative p-0 scroll-smooth">
        <SelectGroup className="flex flex-col gap-y-2 px-2 pb-2">
          {filteredList.map((item, index) => (
            <SelectItem
              className="flex items-center justify-between hover:bg-[#0E0F16] cursor-pointer py-4 rounded-md"
              key={item.coinType + "-" + item.maturity + index}
              value={item.coinType + "-" + item.maturity}
            >
              <div className="flex items-center gap-x-3">
                <img
                  src={item.coinLogo}
                  alt={item.coinName}
                  className="size-8"
                />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {item.coinName} - {formatTimeDiff(parseInt(item.maturity))}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dayjs(parseInt(item.maturity)).format(
                      "DD MMM YYYY HH:mm:ss",
                    )}
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
