import Decimal from "decimal.js"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

const COLORS = ["#2DF4DD", "#0E0F16"]

interface PChartProps {
  cap: string
  tvl: number
  price: number
  decimal: string
}

const PChart = ({ cap, tvl, decimal, price }: PChartProps) => {
  const total = new Decimal(cap).div(decimal).mul(price)
  const tvlValue = new Decimal(tvl).div(total)
  const data = [
    { name: "tvl", value: tvlValue.toNumber() },
    { name: "Group B", value: total.minus(tvlValue).toNumber() },
  ]

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
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export default PChart
