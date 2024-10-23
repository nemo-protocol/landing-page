import dayjs from "dayjs"
import Decimal from "decimal.js"
import Header from "@/components/Header"
import { useCoinInfoList } from "@/queries"
import PieChart from "./components/PieChart.tsx"
import { Link, useNavigate } from "react-router-dom"
import Star from "@/assets/images/svg/market/star.svg"
import Crown from "@/assets/images/svg/market/crown.svg"
// import StarIcon from "@/assets/images/svg/star.svg?react"
import Diamond from "@/assets/images/svg/market/diamond.svg"
import Logo from "@/assets/images/svg/market/logo.svg?react"

export default function Home() {
  const navigate = useNavigate()
  const { data: list } = useCoinInfoList()

  return (
    <>
      <Header />
      <div className="py-10 relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[28px] text-white">Market</h3>
            <h6 className="text-white mt-8">
              Dive into the yield trading market and maximize your profit
              potential.
            </h6>
            <p className="text-white">
              Learn More&nbsp;&nbsp;
              <Link
                to="/learn"
                className="underline text-white underline-offset-2"
              >
                About PT & YT Trading
              </Link>
            </p>
            <div className="flex items-center gap-x-2 mt-9">
              <button className="border border-[#0052F2] bg-[#0052F2]/25 text-[#5D94FF] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Diamond} alt="" />
                <span className="text-xs">All</span>
              </button>
              <button className="border border-[#C2B166] bg-[#C2B166]/25 text-[#C2B166] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Star} alt="" /> <span className="text-xs">New</span>
              </button>
              <button className="border border-[#2DF4DD] bg-[#2DF4DD]/25 text-[#2DF4DD] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Crown} alt="" className="inline-block" />
                <span className="text-xs">Popular</span>
              </button>
            </div>
          </div>
          <Logo />
        </div>
        <div className="mt-[23px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-all duration-1000 ease-in-out">
          {list?.map((item) => (
            <div
              key={item.coinAddress}
              className="p-5 rounded-[21.544px] bg-[#0E0F16]"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2.5 items-start">
                  <div className="flex items-center gap-x-2">
                    <h6 className="text-white">{item.coinName}</h6>
                    {/* <StarIcon />
                    <div className="rounded-3xl px-2 py-0.5 border border-[#71D0FF] text-xs text-[#71D0FF] cursor-pointer">
                      Info
                    </div> */}
                  </div>
                  <div className="rounded-full bg-[#1A1B27] py-1 px-2 flex items-center gap-x-2">
                    <img
                      alt="scallop"
                      className="size-4 block"
                      src={item.providerLogo}
                    />
                    <span className="text-xs">{item.provider}</span>
                  </div>
                </div>
                <img
                  src={item.coinLogo}
                  alt={item.coinName}
                  className="size-14"
                />
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h6 className="text-[#576682] text-xs">Maturity</h6>
                  {item.maturity && (
                    <div className="text-xs text-white shrink-0">
                      <span className="font-bold">
                        {dayjs(parseInt(item.maturity)).format("DD MMM YYYY")}
                      </span>
                      <span className="text-[#576682] ml-2">
                        {dayjs(parseInt(item.maturity)).diff(dayjs(), "day")}
                        &nbsp; DAYS
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#576682] text-xs">TVL</span>
                  <div className="flex items-center gap-x-2">
                    <span className="text-white text-xs font-bold">
                      ${item.tvl.toLocaleString()}
                    </span>
                    <PieChart
                      tvl={item.tvl}
                      cap={item.cap}
                      decimal={item.decimal}
                      price={item.underlyingPrice}
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-xl p-4 bg-[#131520]">
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white mt-1 text-center">
                      ${item.underlyingPrice.toLocaleString()}
                    </div>
                    <div className="text-[#576682] text-xs text-center">
                      Underlying Price
                    </div>
                  </div>
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white mt-1 text-center">
                      {new Decimal(item.underlyingApy).mul(100).toFixed(2)}%
                    </div>
                    <div className="text-[#576682] text-xs text-center">
                      Underlying Apy
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs text-white">Trade</h6>
                <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                  <div
                    className="px-2 py-1.5 bg-[#0F60FF] rounded-xl flex items-center justify-between pl-5 pr-3 h-14 cursor-pointer"
                    onClick={() =>
                      navigate(`/market/detail/${item.coinAddress}/swap/buy/yt`)
                    }
                  >
                    <span className="text-white text-sm">YT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-base text-white">
                        {new Decimal(item.ytApy).toFixed(2)}%
                      </span>
                      <span className="text-xs text-white">
                        ${item.ytPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div
                    className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black pl-5 pr-3 h-14 cursor-pointer"
                    onClick={() =>
                      navigate(`/market/detail/${item.coinAddress}/swap/buy/pt`)
                    }
                  >
                    <span className="text-sm">PT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-base">
                        {new Decimal(Number(item.ptApy)).toFixed(2)}%
                      </span>
                      <span className="text-xs">
                        ${item.ptPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs">Earn</h6>
                <button
                  className="mt-2.5 py-3 pl-7 pr-4.5 flex items-center justify-between text-sm bg-[#62CAFF] w-full text-black h-14 rounded-xl cursor-pointer"
                  onClick={() =>
                    navigate(`/market/detail/${item.coinAddress}/liquidity`)
                  }
                >
                  <span>+ POOL APY</span>
                  <span className="text-base">{new Decimal(item.poolApy).toFixed(2)}%</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
