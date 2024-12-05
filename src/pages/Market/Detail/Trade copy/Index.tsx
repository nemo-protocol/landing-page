import Buy from "./Swap/Buy"
import Sell from "./Swap/Sell"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import SwitchIcon from "@/assets/images/svg/switch.svg?react"
// import LoadingIcon from "@/assets/images/svg/loading.svg?react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function Trade() {
  const navigate = useNavigate()
  const [slippage, setSlippage] = useState("0.5")
  const {
    coinType,
    maturity,
    action = "buy",
  } = useParams<{
    coinType: string
    maturity: string
    action?: string
  }>()
  return (
    <div className="w-full bg-[#0E0F16] rounded-[40px] px-5 py-7">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-x-7">
          <span
            onClick={() =>
              action !== "buy" &&
              navigate(`/market/detail/${coinType}/${maturity}/swap/buy`)
            }
            className={
              action === "buy" ? "text-white" : "text-white/50 cursor-pointer"
            }
          >
            Buy
          </span>
          <span
            onClick={() =>
              action !== "sell" &&
              navigate(`/market/detail/${coinType}/${maturity}/swap/sell`)
            }
            className={
              action === "sell" ? "text-white" : "text-white/50 cursor-pointer"
            }
          >
            Sell
          </span>
        </div>
        <div className="flex items-center gap-x-2 w-auto">
          {/* <LoadingIcon /> */}
          <div className="bg-[#242632]/30 rounded-md py-1.5 px-2.5">
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-x-2 cursor-pointer">
                  <SwitchIcon />
                  <span className="text-white">{slippage}%</span>
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
                      onClick={() => setSlippage("0.1")}
                    >
                      0.1%
                    </button>
                    <button
                      className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] text-xs text-white"
                      onClick={() => setSlippage("0.5")}
                    >
                      0.5%
                    </button>
                    <button
                      className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] text-xs text-white"
                      onClick={() => setSlippage("1")}
                    >
                      1%
                    </button>
                    <div className="relative">
                      <input
                        type="text"
                        className="px-4 py-2.5 bg-[#36394B5C] rounded-[28px] placeholder:text-xs w-full outline-none text-white"
                        placeholder="Custom"
                        onChange={(e) => setSlippage(e.target.value)}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white mt-0.5">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      {action === "buy" && <Buy slippage={slippage} />}
      {action === "sell" && <Sell slippage={slippage} />}
    </div>
  )
}
