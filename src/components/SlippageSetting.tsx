import { SlidersHorizontal } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"

interface SlippageSettingProps {
  slippage: string
  setSlippage: (value: string) => void
}

const SlippageSetting: React.FC<SlippageSettingProps> = ({
  slippage,
  setSlippage,
}) => {
  const [open, setOpen] = useState(false)

  const handleSlippageChange = (value: string) => {
    setSlippage(value)
    setOpen(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-x-1 sm:gap-x-2 cursor-pointer bg-[#161720]/50 rounded-full px-2.5 sm:px-3 py-1.5">
          <span className="text-white/60 text-xs sm:text-sm">{slippage}%</span>
          <SlidersHorizontal className="size-4 sm:size-5" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-80 bg-[#161720] border-none rounded-3xl p-3 sm:p-4">
        <div className="grid gap-3 sm:gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-xs sm:text-sm text-center py-1.5 sm:py-2 text-white">
              Slippage Setting
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-x-1.5 sm:gap-x-2 gap-y-3 sm:gap-y-4">
            <button
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[28px] text-[10px] sm:text-xs text-white"
              onClick={() => handleSlippageChange("0.1")}
            >
              0.1%
            </button>
            <button
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[28px] text-[10px] sm:text-xs text-white"
              onClick={() => handleSlippageChange("0.5")}
            >
              0.5%
            </button>
            <button
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[28px] text-[10px] sm:text-xs text-white"
              onClick={() => handleSlippageChange("1")}
            >
              1%
            </button>
            <div className="relative col-span-3">
              <input
                type="text"
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[28px] placeholder:text-[10px] sm:placeholder:text-xs w-full outline-none text-white text-[10px] sm:text-xs"
                placeholder="Custom"
                onChange={(e) => setSlippage(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-white mt-0.5">
                %
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default SlippageSetting
