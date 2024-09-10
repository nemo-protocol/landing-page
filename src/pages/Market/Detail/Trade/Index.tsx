import Mint from "./MInt/Index"
import { useState } from "react"
import SwitchIcon from "@/assets/images/svg/switch.svg?react"
import LoadingIcon from "@/assets/images/svg/loading.svg?react"

export default function Trade() {
  const [nav, setNav] = useState<"Swap" | "Mint">("Mint")
  return (
    <div className="w-full bg-[#0E0F16] rounded-[40px] px-5 py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-7">
          <span
            onClick={() => setNav("Swap")}
            className={
              nav === "Swap" ? "text-white" : "text-white/50 cursor-pointer"
            }
          >
            Swap
          </span>
          <span
            onClick={() => setNav("Mint")}
            className={
              nav === "Mint" ? "text-white" : "text-white/50 cursor-pointer"
            }
          >
            Mint
          </span>
        </div>
        <div className="flex items-center gap-x-2 w-auto">
          <LoadingIcon />
          <div className="flex items-center gap-x-2 bg-[#242632]/30 rounded-md py-1.5 px-2.5">
            <SwitchIcon />
            <span className="text-white">0.5%</span>
          </div>
        </div>
      </div>
      {nav === "Mint" && <Mint />}
    </div>
  )
}
