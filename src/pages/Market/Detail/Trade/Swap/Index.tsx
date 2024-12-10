import Sell from "./Sell"
import { useNavigate, useParams } from "react-router-dom"

export default function TradeMint() {
  const navigate = useNavigate()
  const {
    coinType,
    maturity,
    action = "buy",
  } = useParams<{
    action?: string
    maturity: string
    coinType: string
  }>()
  return (
    <>
      <div className="flex items-center rounded-[40px] w-40 my-6 bg-[#242632]">
        <div
          onClick={() =>
            action !== "buy" &&
            navigate(`/market/detail/${coinType}/${maturity}/swap/buy`)
          }
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            action === "buy" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Buy
        </div>
        <div
          onClick={() =>
            action !== "sell" &&
            navigate(`/market/detail/${coinType}/${maturity}/swap/sell`)
          }
          className={[
            "text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center",
            action === "sell" ? "bg-[#0F60FF]" : "cursor-pointer",
          ].join(" ")}
        >
          Sell
        </div>
      </div>
      {/* {action === "buy" && <Buy slippage={slippage} />} */}
      {action === "sell" && <Sell />}
    </>
  )
}
