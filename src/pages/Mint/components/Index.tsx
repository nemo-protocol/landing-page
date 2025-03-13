import Mint from "./Mint"
import Redeem from "./Redeem"
import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import PoolSelect from "@/components/PoolSelect"
import { useNavigate, useParams } from "react-router-dom"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function Trade() {
  const navigate = useNavigate()
  const [slippage, setSlippage] = useState("0.5")
  const { action = "mint" } = useParams<{
    action?: string
  }>()
  const [coinType, setCoinType] = useState("")
  const [maturity, setMaturity] = useState("")

  return (
    <div className="w-full bg-[#0E0F16] rounded-[24px] sm:rounded-[40px] p-3 sm:p-4 lg:p-8 border border-white/[0.07] max-w-[500px] mx-auto space-y-3 sm:space-y-4">
      <PoolSelect
        coinType={coinType}
        maturity={maturity}
        filterExpired={action !== "redeem"}
        onChange={(coinType, maturity) => {
          setCoinType(coinType)
          setMaturity(maturity)
        }}
      />
      <div className="bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07] flex flex-col gap-y-3 sm:gap-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3 sm:gap-y-0">
          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-5 sm:gap-x-7">
              <span
                onClick={() => action !== "mint" && navigate(`/mint`)}
                className={[
                  action === "mint"
                    ? "text-white"
                    : "text-white/50 cursor-pointer",
                  "text-sm sm:text-base"
                ].join(" ")}
              >
                Mint
              </span>
              <span
                onClick={() => action !== "redeem" && navigate(`/mint/redeem`)}
                className={[
                  action === "redeem"
                    ? "text-white"
                    : "text-white/50 cursor-pointer",
                  "text-sm sm:text-base"
                ].join(" ")}
              >
                Redeem
              </span>
            </div>
          </div>
          <div className="flex items-center gap-x-2 w-auto">
            <div className="flex items-center gap-x-2 bg-[#242632]/30 rounded-md py-1.5 px-2 sm:px-3">
              <SlidersHorizontal className="size-3 sm:size-4" />
              <Popover>
                <PopoverTrigger asChild>
                  <span className="text-white cursor-pointer text-sm sm:text-base">{slippage}%</span>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] sm:w-80 bg-[#161720] border-none rounded-2xl sm:rounded-3xl">
                  <div className="grid gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none text-xs py-3 sm:py-4 px-4 sm:px-6">
                        Slippage Setting
                      </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-y-4 px-2 sm:px-0">
                      <button
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[20px] sm:rounded-[28px] text-xs"
                        onClick={() => setSlippage("0.1")}
                      >
                        0.1%
                      </button>
                      <button
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[20px] sm:rounded-[28px] text-xs"
                        onClick={() => setSlippage("0.5")}
                      >
                        0.5%
                      </button>
                      <button
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[20px] sm:rounded-[28px] text-xs"
                        onClick={() => setSlippage("1")}
                      >
                        1%
                      </button>
                      <div className="relative col-span-3">
                        <input
                          type="text"
                          className="px-4 py-2 sm:py-2.5 bg-[#36394B5C] rounded-[20px] sm:rounded-[28px] placeholder:text-xs w-full outline-none text-sm"
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
        {action === "mint" && <Mint coinType={coinType} maturity={maturity} />}
        {action === "redeem" && (
          <Redeem coinType={coinType} maturity={maturity} />
        )}
      </div>
    </div>
  )
}
