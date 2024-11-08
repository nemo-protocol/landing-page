import { useState } from "react"
// import MultiCoin from "./MultiCoin"
import SingleCoin from "./SingleCoin"

export default function TradeMint({ slippage }: { slippage: string }) {
  const [nav, setNav] = useState<"Single-coin" | "Multi-coin">("Single-coin")
  return (
    <>
      <div className="flex items-center rounded-[40px] w-60 my-6 bg-[#242632]">
        <div
          onClick={() => setNav("Single-coin")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Single-coin" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Single-coin
        </div>
        <div
          onClick={() => setNav("Multi-coin")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Multi-coin" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Multi-coin
        </div>
      </div>
      {nav === "Single-coin" && <SingleCoin slippage={slippage} />}
      {nav === "Multi-coin" && <SingleCoin slippage={slippage} />}
    </>
  )
}
