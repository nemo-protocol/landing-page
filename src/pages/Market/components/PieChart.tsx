import Decimal from "decimal.js"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const COLORS = ["#2DF4DD", "#0E0F16"]

interface PChartProps {
  cap?: string
  tvl?: number
  price?: number
  decimal?: string
}

const PChart = ({ cap, tvl, decimal, price }: PChartProps) => {
  const total = new Decimal(cap || 0)
    .div(10 ** (Number(decimal) || 0))
    .mul(price || 0)
  const tvlValue = new Decimal(tvl || 0)

  const data = [
    { name: "tvl", value: tvlValue.toNumber() },
    { name: "other", value: total.minus(tvlValue).toNumber() },
  ]

  const CustomTooltip = () => {
    return (
      <div className="custom-tooltip bg-[#1d2435] py-1 px-2 rounded-lg w-24">
        <p className="text-xs">{`${tvlValue.div(total).mul(100).toFixed(2)}% Pool Cap Filled`}</p>
      </div>
    )
  }

  return (
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
  )
}

export default PChart
