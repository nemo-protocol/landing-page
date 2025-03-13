import { useState } from "react"
import Header from "@/components/Header"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import Mint from "./components/Index"

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
  const [type, setType] = useState<"APY" | "Price">("APY")
  const [tab, setTab] = useState<"Details" | "Calculator">("Details")
  const [timeRange, setTimeRange] = useState<"1h" | "1D" | "1W">("1h")

  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="py-6 sm:py-10 relative px-4 sm:px-6 xl:px-0 xl:max-w-[1200px] xl:mx-auto">
        <h3
          onClick={() => navigate("/market")}
          className="text-base sm:text-lg text-white flex items-center gap-x-2 cursor-pointer"
        >
          <ArrowLeft className="size-4 sm:size-5" />
          <span>Back</span>
        </h3>
        <div className="mt-6 sm:mt-9 flex xl:flex-row flex-col gap-6 xl:gap-x-8 justify-center">
          <Mint />
          <div className="grow flex xl:flex-col flex-col-reverse gap-y-4 sm:gap-y-5 hidden">
            <div className="w-full p-4 sm:px-10 sm:py-6 flex items-start sm:items-center justify-between bg-[#0E0F16] rounded-2xl sm:rounded-3xl flex-col sm:flex-row gap-y-4 sm:gap-y-0">
              <div className="flex items-center gap-x-4 w-full sm:w-auto">
                <img src="/images/svg/sSUI.svg" alt="" className="size-[48px] sm:size-[60px]" />
                <div className="flex flex-col">
                  <span className="text-white text-base sm:text-lg">PT sSUI</span>
                  <span className="text-white text-xs">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 sm:gap-x-8 w-full sm:w-auto">
                <div className="flex flex-col gap-y-1 sm:gap-y-2 items-start sm:items-center justify-center">
                  <span className="text-white text-base sm:text-lg">$232,523,76.36</span>
                  <span className="text-white/50 text-xs">TVL</span>
                </div>
                <div className="flex flex-col gap-y-1 sm:gap-y-2 items-start sm:items-center justify-center">
                  <span className="text-white text-base sm:text-lg">Apr 24 2025</span>
                  <span className="text-white/50 text-xs">Maturity</span>
                </div>
                <div className="flex flex-col gap-y-1 sm:gap-y-2 items-start sm:items-center justify-center">
                  <span className="text-white text-base sm:text-lg">3.56%</span>
                  <span className="text-white/50 text-xs">Underlying APY</span>
                </div>
                <div className="flex flex-col gap-y-1 sm:gap-y-2 items-start sm:items-center justify-center">
                  <span className="text-white text-base sm:text-lg">6.66%</span>
                  <span className="text-white/50 text-xs">Fixed APY</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0E0F16] rounded-2xl sm:rounded-3xl p-4 sm:p-7.5">
              <div>
                <div className="flex items-center gap-x-5 sm:gap-x-7">
                  <span
                    onClick={() => setTab("Details")}
                    className={[
                      tab === "Details" ? "text-white" : "text-white/40",
                      "cursor-pointer text-sm sm:text-base",
                    ].join(" ")}
                  >
                    Details
                  </span>
                  <span
                    onClick={() => setTab("Calculator")}
                    className={[
                      tab === "Calculator" ? "text-white" : "text-white/40",
                      "cursor-pointer text-sm sm:text-base",
                    ].join(" ")}
                  >
                    Calculator
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 sm:gap-y-0 mt-4 sm:mt-7">
                  <div className="flex items-center gap-x-3 sm:gap-x-4">
                    <span
                      onClick={() => setTimeRange("1h")}
                      className={[
                        timeRange === "1h" ? "rounded-[16px] sm:rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer text-sm",
                      ].join(" ")}
                    >
                      1h
                    </span>
                    <span
                      onClick={() => setTimeRange("1D")}
                      className={[
                        timeRange === "1D" ? "rounded-[16px] sm:rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer text-sm",
                      ].join(" ")}
                    >
                      1D
                    </span>
                    <span
                      onClick={() => setTimeRange("1W")}
                      className={[
                        timeRange === "1W" ? "rounded-[16px] sm:rounded-[20px] bg-[#1E212B]" : "",
                        "py-1 px-2 cursor-pointer text-sm",
                      ].join(" ")}
                    >
                      1W
                    </span>
                  </div>
                  <div className="bg-[#242632] rounded-[24px] sm:rounded-[30px] text-xs sm:text-sm">
                    <span
                      onClick={() => setType("APY")}
                      className={[
                        type === "APY" && "bg-[#0F60FF] rounded-[24px] sm:rounded-[30px]",
                        "py-1 px-2.5 sm:px-3.5 cursor-pointer",
                      ].join(" ")}
                    >
                      APY
                    </span>
                    <span
                      onClick={() => setType("Price")}
                      className={[
                        type === "Price" && "bg-[#0F60FF] rounded-[24px] sm:rounded-[30px]",
                        "py-1 px-2.5 sm:px-3.5 cursor-pointer",
                      ].join(" ")}
                    >
                      Price
                    </span>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="mt-8 sm:mt-14">
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
