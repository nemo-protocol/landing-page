import Mint from "./Mint"
import { useState } from "react"

export default function TradeMint({slippage}:{slippage:string}) {
  const [nav, setNav] = useState<"Mint" | "Redeem">("Mint")
  return (
    <>
      <div className="flex items-center rounded-[40px] w-40 my-6 bg-[#242632]">
        <div
          onClick={() => setNav("Mint")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Mint" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Mint
        </div>
        <div
          onClick={() => setNav("Redeem")}
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            nav === "Redeem" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Redeem
        </div>
      </div>
      {nav === "Mint" && <Mint slippage={slippage}/>}
    </>
  )
}
