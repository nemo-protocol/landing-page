import { useState } from "react"
import Loading from "@/assets/images/svg/loading.svg"
import Swtich from "@/assets/images/svg/swtich.svg"
import Wallet from "@/assets/images/svg/wallet.svg"
import sSUI from "@/assets/images/svg/sSUI.svg"
import Add from "@/assets/images/svg/add.svg"
import Swap from "@/assets/images/svg/swap.svg"
import { useNavigate } from "react-router-dom"
import Header from "@/components/Header"
import DownArrow from "@/assets/images/svg/down-arrow.svg"
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
  const [type, setType] = useState<"APY" | "Price">("APY")
  const [tab, setTab] = useState<"Details" | "Calculator">("Details")
  const [timeRange, setTimeRange] = useState<"1h" | "1D" | "1W">("1h")

  return (
    <div className="min-h-screen max-w-[1440px] mx-auto">
      <Header />
      <div className="py-10 relative">
        <h3
          className="text-lg text-white flex items-center gap-x-2 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <LeftArrow /> <span>All Markets</span>
        </h3>
        <div className="mt-9 flex gap-x-8">
          <div className="w-[360px] flex flex-col gap-y-5">
            <div className="w-full flex items-center h-[50px] bg-[#0E0F16] rounded-[40px]">
              <div className="flex-1 bg-[#0F60FF] rounded-[40px] h-full flex items-center justify-center">
                Trade
              </div>
              <div className="flex-1 h-full flex items-center justify-center">
                Liquidity
              </div>
            </div>
            <div className="w-full bg-[#0E0F16] rounded-[40px] px-5 py-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-7">
                  <span className="text-white">Swap</span>
                  <span className="text-white/50">Mint</span>
                </div>
                <div className="flex items-center gap-x-2 w-auto">
                  <img src={Loading} alt="" />
                  <div className="flex items-center gap-x-2 bg-[#242632]/30 rounded-md py-1.5 px-2.5">
                    <img src={Swtich} alt="" />
                    <span className="text-white">0.5%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center rounded-[40px] w-40 my-6 bg-[#242632]">
                <div className="bg-[#0F60FF] text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center">
                  Mint
                </div>
                <div className="text-white flex-1 py-1.5 text-sm flex items-center justify-center">
                  Redeem
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-white">Input</div>
                <div className="flex items-center gap-x-1">
                  <img src={Wallet} alt="" />
                  <span>Balance:1998.45</span>
                </div>
              </div>
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
              <div className="flex items-center gap-x-2 justify-end mt-3.5">
                <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">
                  Harlf
                </div>
                <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">
                  Max
                </div>
              </div>
              <img src={Swap} alt="" className="mx-auto mt-5" />
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
              <img src={Add} alt="" className="mx-auto mt-5" />
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
            </div>
          </div>
          <div className="grow flex flex-col gap-y-5">
            <div className="w-full px-10 py-6 flex items-center justify-between bg-[#0E0F16] rounded-3xl">
              <div className="flex items-center gap-x-4">
                <img src={sSUI} alt="" className="size-[60px]" />
                <div className="flex flex-col">
                  <span className="text-white text-lg">PT sSUI</span>
                  <span className="text-white text-xs">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">$232,523,76.36</span>
                <span className="text-white/50 text-xs">TVL</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">Apr 24 2025</span>
                <span className="text-white/50 text-xs">Maturity</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">3.56%</span>
                <span className="text-white/50 text-xs">Underlying APY</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">6.66%</span>
                <span className="text-white/50 text-xs">Fixed APY</span>
              </div>
            </div>
            <div className="bg-[#0E0F16] rounded-3xl p-7.5">
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
    </div>
  )
}
