import dayjs from "dayjs"
import { useMemo, useState } from "react"
import { cn, formatTimeDiff } from "@/lib/utils"
import { useCoinInfoList } from "@/queries"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { X, CalendarIcon, SlidersHorizontal } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

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
  const { data: list, isLoading } = useCoinInfoList({ isShowExpiry: 1 })
  const [searchName, setSearchName] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const resetSearch = () => {
    setSearchName("")
    setStartDate(undefined)
    setEndDate(undefined)
  }

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
    
    return list
      .filter((coin) => {
        const matchesExpiry = filterExpired ? parseInt(coin.maturity) > Date.now() : true
        const matchesName = coin.coinName.toLowerCase().includes(searchName.toLowerCase())
        
        const maturityTimestamp = parseInt(coin.maturity)
        const startTimestamp = startDate ? startDate.getTime() : 0
        const endTimestamp = endDate ? endDate.getTime() : Infinity
        const matchesDateRange = maturityTimestamp >= startTimestamp && maturityTimestamp <= endTimestamp
        
        return matchesExpiry && matchesName && matchesDateRange
      })
  }, [list, filterExpired, searchName, startDate, endDate])

  return (
    <Select
      value={value}
      onValueChange={(item) => {
        const [coinAddress, maturity] = item.split("-")
        if (onChange) {
          onChange(coinAddress, maturity)
        }
      }}
      disabled={isLoading}
    >
      <SelectTrigger
        className={cn(
          "w-full text-wrap border-none bg-[#131520] h-16 p-3 rounded-2xl",
          isLoading && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <div className="flex items-center gap-x-3">
          {selectedPool?.coinLogo && (
            <img
              src={selectedPool.coinLogo}
              alt={selectedPool.coinName}
              className="size-8 lg:size-10"
            />
          )}
          <h2 className="text-lg lg:text-xl font-normal text-left">
            {isLoading ? "Loading..." : displayName}
          </h2>
        </div>
      </SelectTrigger>
      <SelectContent className="border-none bg-[#131520]">
        <div className="flex flex-col gap-2 p-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-[#0E0F16] border-none"
            />
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "flex items-center justify-center size-10 bg-[#0E0F16] rounded-md hover:bg-[#1A1B23] transition-colors",
                showAdvanced && "bg-[#1A1B23]"
              )}
            >
              <SlidersHorizontal className="size-4" />
            </button>
            {(searchName || startDate || endDate || showAdvanced) && (
              <button
                onClick={resetSearch}
                className="flex items-center justify-center size-10 bg-[#0E0F16] rounded-md hover:bg-[#1A1B23] transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {showAdvanced && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#0E0F16] border-none hover:bg-[#1A1B23]",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? dayjs(startDate).format("YYYY-MM-DD") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#131520] border-none" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#0E0F16] border-none hover:bg-[#1A1B23]",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? dayjs(endDate).format("YYYY-MM-DD") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#131520] border-none" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <SelectGroup className="flex flex-col gap-y-2">
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
                    {item.coinName} -{" "}
                    {formatTimeDiff(parseInt(item.maturity))}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dayjs(parseInt(item.maturity)).format("DD MMM YYYY HH:mm:ss")}
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
