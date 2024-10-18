import { useState } from "react"
import Trade from "./Trade/Index.tsx"
import Header from "@/components/Header"
import Liquidity from "./Liquidity/Index.tsx"
import sSUI from "@/assets/images/svg/sSUI.svg"
import { useNavigate, useParams } from "react-router-dom"
import LeftArrow from "@/assets/images/svg/left-arrow.svg?react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function Home() {
  const navigate = useNavigate()
  const { coinType, operation = "swap" } = useParams<{
    coinType: string
    operation?: string
  }>()
  const [type, setType] = useState<"APY" | "Price">("APY")
  const [tab, setTab] = useState<"Details" | "Calculator">("Details")
  const [timeRange, setTimeRange] = useState<"1h" | "1D" | "1W">("1h")

  return (
    <>
      <Header />
      <div className="py-10 relative px-6 xl:px-0">
        <h3
          onClick={() => navigate('/market')}
          className="text-lg text-white flex items-center gap-x-2 cursor-pointer"
        >
          <LeftArrow />
          <span>Back</span>
        </h3>
        <div className="mt-9 flex xl:flex-row flex-col gap-x-8 justify-center">
          <div className="w-full xl:w-[360px] flex flex-col gap-y-5">
            <div className="w-full flex items-center h-[50px] bg-[#0E0F16] rounded-[40px]">
              <div
                onClick={() =>
                  !["swap", "mint"].includes(operation) &&
                  navigate(`/market/detail/${coinType}/swap`)
                }
                className={[
                  "flex-1 rounded-[40px] h-full flex items-center justify-center",
                  ["swap", "mint"].includes(operation)
                    ? "bg-[#0F60FF]"
                    : "cursor-pointer",
                ].join(" ")}
              >
                Trade
              </div>
              <div
                onClick={() =>
                  operation !== "liquidity" &&
                  navigate(`/market/detail/${coinType}/liquidity`)
                }
                className={[
                  "flex-1 rounded-[40px] h-full flex items-center justify-center",
                  operation === "liquidity" ? "bg-[#0F60FF]" : "cursor-pointer",
                ].join(" ")}
              >
                Liquidity
              </div>
            </div>
            {["swap", "mint"].includes(operation) && <Trade />}
            {operation === "liquidity" && <Liquidity />}
          </div>
          <div className="grow flex xl:flex-col flex-col-reverse gap-y-5 hidden">
            <div className="w-full md:px-10 md:py-6 flex items-center justify-between bg-[#0E0F16] rounded-3xl flex-col md:flex-row gap-y-5 md:gap-y-0">
              <div className="flex items-center gap-x-4 w-full md:w-auto">
                <img src={sSUI} alt="" className="size-[60px]" />
                <div className="flex flex-col">
                  <span className="text-white text-lg">PT sSUI</span>
                  <span className="text-white text-xs">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-row-reverse md:flex-col gap-y-2 items-center justify-between md:justify-center w-full md:w-auto">
                <span className="text-white text-lg">$232,523,76.36</span>
                <span className="text-white/50 text-xs">TVL</span>
              </div>
              <div className="flex flex-row-reverse md:flex-col gap-y-2 items-center justify-between md:justify-center w-full md:w-auto">
                <span className="text-white text-lg">Apr 24 2025</span>
                <span className="text-white/50 text-xs">Maturity</span>
              </div>
              <div className="flex flex-row-reverse md:flex-col gap-y-2 items-center justify-between md:justify-center w-full md:w-auto">
                <span className="text-white text-lg">3.56%</span>
                <span className="text-white/50 text-xs">Underlying APY</span>
              </div>
              <div className="flex flex-row-reverse md:flex-col gap-y-2 items-center justify-between md:justify-center w-full md:w-auto">
                <span className="text-white text-lg">6.66%</span>
                <span className="text-white/50 text-xs">Fixed APY</span>
              </div>
            </div>
            <div className="bg-[#0E0F16] rounded-3xl md:p-7.5">
              <div>
                <div className="flex items-center gap-x-7">
                  <span
                    onClick={() => setTab("Details")}
                    className={[
                      tab === "Details" ? "text-white" : "text-white/40",
                      "cursor-pointer",
                    ].join(" ")}
                  >
                    Details
                  </span>
                  <span
                    onClick={() => setTab("Calculator")}
                    className={[
                      tab === "Calculator" ? "text-white" : "text-white/40",
                      "cursor-pointer",
                    ].join(" ")}
                  >
                    Calculator
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-4 mt-7">
                    <span
                      onClick={() => setTimeRange("1h")}
                      className={[
                        timeRange === "1h" ? "rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer",
                      ].join(" ")}
                    >
                      1h
                    </span>
                    <span
                      onClick={() => setTimeRange("1D")}
                      className={[
                        timeRange === "1D" ? "rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer",
                      ].join(" ")}
                    >
                      1D
                    </span>
                    <span
                      onClick={() => setTimeRange("1W")}
                      className={[
                        timeRange === "1W" ? "rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer",
                      ].join(" ")}
                    >
                      1W
                    </span>
                  </div>
                  <div className="bg-[#242632] rounded-[30px] text-sm">
                    <span
                      onClick={() => setType("APY")}
                      className={[
                        type === "APY" && "bg-[#0F60FF] rounded-[30px]",
                        "py-1 px-3.5 cursor-pointer",
                      ].join(" ")}
                    >
                      APY
                    </span>
                    <span
                      onClick={() => setType("Price")}
                      className={[
                        type === "Price" && "bg-[#0F60FF] rounded-[30px]",
                        "py-1 px-3.5 cursor-pointer",
                      ].join(" ")}
                    >
                      Price
                    </span>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="mt-14">
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    dataKey="desktop"
                    type="monotone"
                    stroke="#0F60FF"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="mobile"
                    type="monotone"
                    stroke="#44E0C3"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
