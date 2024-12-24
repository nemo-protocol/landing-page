import { useState } from "react"
import Sell from "./components/Sell.tsx"
import Header from "@/components/Header"
import { ArrowLeft } from "lucide-react"
import Remove from "./components/Remove.tsx"
import { useNavigate, useParams } from "react-router-dom"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import Add from "./components/Add.tsx"
import Trade from "./components/Trade.tsx"
import Invest from "./components/Invest.tsx"

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
  const { tokenType, operation = "swap" } = useParams<{
    tokenType: string
    operation?: string
  }>()
  const [type, setType] = useState<"APY" | "Price">("APY")
  const [tab, setTab] = useState<"Details" | "Calculator">("Details")
  const [timeRange, setTimeRange] = useState<"1h" | "1D" | "1W">("1h")

  const renderMainContent = () => {
    if (operation === "add") {
      return <Add />
    }

    if (operation === "swap") {
      if (tokenType === "yt") {
        return <Trade />
      }
      if (tokenType === "pt") {
        return (
          <div className="w-full md:w-[500px] flex flex-col gap-y-5">
            <Invest />
          </div>
        )
      }
    }

    if (operation === "sell") {
      return (
        <div className="w-full md:w-[500px] flex flex-col gap-y-5">
          <Sell />
        </div>
      )
    }

    if (operation === "remove") {
      return (
        <div className="w-full md:w-[500px] flex flex-col gap-y-5">
          <Remove />
        </div>
      )
    }

    return null
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #0C0C14 0%, #07070C 100%)",
      }}
    >
      <div className="w-full bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-7.5 xl:px-0">
          <Header />
        </div>
      </div>
      <div className="xl:max-w-[1200px] xl:mx-auto px-7.5 xl:px-0 pb-20">
        <h3
          onClick={() => navigate(-1)}
          className="text-lg text-white flex items-center gap-x-2 cursor-pointer"
        >
          <ArrowLeft />
        </h3>
        <div className="mt-5 md:mt-20 relative">
          <div className="flex xl:flex-row flex-col gap-x-8 justify-center items-center">
            {renderMainContent()}
            <div className="grow flex xl:flex-col flex-col-reverse gap-y-5 hidden">
              <div className="w-full md:px-10 md:py-6 flex items-center justify-between bg-[#0E0F16] rounded-3xl flex-col md:flex-row gap-y-5 md:gap-y-0">
                <div className="flex items-center gap-x-4 w-full md:w-auto">
                  <img src="/images/svg/sSUI.svg" alt="" className="size-[60px]" />
                  <div className="flex flex-col">
                    <span className="text-white text-lg">PT sSUI</span>
                    <span className="text-white text-xs">
                      28 Aug 2024{" "}
                      <span className="text-[#2DF4DD]">41 DAYS</span>
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
                          timeRange === "1h"
                            ? "rounded-[20px] bg-[#1E212B]"
                            : "",
                          "py-1 px-2 cursor-pointer",
                        ].join(" ")}
                      >
                        1h
                      </span>
                      <span
                        onClick={() => setTimeRange("1D")}
                        className={[
                          timeRange === "1D"
                            ? "rounded-[20px] bg-[#1E212B]"
                            : "",
                          "py-1 px-2 cursor-pointer",
                        ].join(" ")}
                      >
                        1D
                      </span>
                      <span
                        onClick={() => setTimeRange("1W")}
                        className={[
                          timeRange === "1W"
                            ? "rounded-[20px] bg-[#1E212B]"
                            : "",
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
      </div>
    </div>
  )
}
