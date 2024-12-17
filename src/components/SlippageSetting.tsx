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
        <div className="flex items-center gap-x-2 cursor-pointer">
          <span className="text-white/60">{slippage}%</span>
          <SlidersHorizontal className="size-5" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#161720] border-none rounded-3xl">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-xs py-4 px-6 text-white">
              Slippage Setting
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            <button
              className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] text-xs text-white"
              onClick={() => handleSlippageChange("0.1")}
            >
              0.1%
            </button>
            <button
              className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] text-xs text-white"
              onClick={() => handleSlippageChange("0.5")}
            >
              0.5%
            </button>
            <button
              className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] text-xs text-white"
              onClick={() => handleSlippageChange("1")}
            >
              1%
            </button>
            <div className="relative">
              <input
                type="text"
                className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] placeholder:text-xs w-full outline-none text-white"
                placeholder="Custom"
                onChange={(e) => setSlippage(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white mt-0.5">
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
