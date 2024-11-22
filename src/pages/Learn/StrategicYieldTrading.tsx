import StrategicYieldTradingPNG from "@/assets/images/png/learn/StrategicYieldTrading.png"

export default function StrategicYieldTrading() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl">Strategic yield trading</h1>
      <p className="mt-4 text-white/[0.68]">
        As we are aware, the yield market constantly fluctuates, and so does the
        Fixing Yield and Long Yield
      </p>
      <img src={StrategicYieldTradingPNG} alt="" className="mt-7.5 pr-4" />
    </div>
  )
}
