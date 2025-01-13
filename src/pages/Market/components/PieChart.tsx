import { useMemo } from "react"
import Decimal from "decimal.js"
import { MarketState } from "@/hooks/types"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const COLORS = ["#2DF4DD", "#0E0F16"]

interface PChartProps {
  marketState: MarketState
}

const PChart = ({ marketState }: PChartProps) => {

  const ratio = useMemo(() => {
    if (marketState?.totalSy && marketState?.marketCap) {
      return new Decimal(marketState.totalSy)
        .div(new Decimal(marketState.marketCap))
        .toNumber()
    }
    return 0
  }, [marketState])

  const data = useMemo(
    () => [
      { name: "tvl", value: ratio },
      { name: "other", value: 1 - ratio },
    ],
    [ratio]
  )

  const CustomTooltip = () => {
    return (
      <div className="custom-tooltip bg-[#1d2435] py-1 px-2 rounded-lg w-24">
        <p className="text-xs">{`${new Decimal(ratio).mul(100).toFixed(2)}% Pool Cap Filled`}</p>
      </div>
    )
  }

  return (
    <>
      <ResponsiveContainer width={16} height={16}>
        <PieChart>
          <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={7}
          fill="#2DF4DD"
          dataKey="value"
          stroke="#2DF4DD"
          isAnimationActive={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </>
  )
}

export default PChart
