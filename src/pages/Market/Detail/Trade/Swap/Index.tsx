import Mint from "./Buy"
import Redeem from "./Sell"
import { useState } from "react"

export default function TradeMint({ slippage }: { slippage: string }) {
  const [nav, setNav] = useState<"Buy" | "Sell">("Buy")
  return (
    <>
      <div className="flex items-center rounded-[40px] w-40 my-6 bg-[#242632]">
        <div
          onClick={() => setNav("Buy")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Buy" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Buy
        </div>
        <div
          onClick={() => setNav("Sell")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Sell" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Sell
        </div>
      </div>
      {nav === "Buy" && <Mint slippage={slippage} />}
      {nav === "Sell" && <Redeem slippage={slippage} />}
    </>
  )
}
