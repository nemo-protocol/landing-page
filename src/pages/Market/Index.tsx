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
// import Logo from "@/assets/images/svg/market/logo.svg?react"
import Blcok from "@/assets/images/png/block.png"
import { motion } from "framer-motion"

export default function Home() {
  const navigate = useNavigate()
  const { data: list } = useCoinInfoList()

  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-7.5 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="py-10 relative xl:max-w-[1200px] xl:mx-auto px-7.5 xl:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[28px] text-white font-black">Market</h3>
            <h6 className="text-white/70 mt-8">
              Dive into the yield trading market and maximize your profit
              potential.
            </h6>
            <p className="text-white/70">
              Learn More&nbsp;&nbsp;
              <Link
                to="/learn"
                className="underline text-white/70 underline-offset-2"
              >
                About PT & YT Trading
              </Link>
            </p>
            <div className="flex items-center gap-x-2 mt-9 hidden">
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
          <div
            className="flex items-center justify-between w-[600px] h-[280px] rounded-2xl pl-[37px] pr-5"
            style={{
              background:
                "linear-gradient(68deg, #09111F 44.65%, #0E2F6D 78.49%, #4693FF 114.03%)",
            }}
          >
            <div className="flex flex-col">
              <h4 className="text-white">Getting Started</h4>
              <p className="w-[250px] text-xs scale-[0.83] origin-left mt-3 text-white/70">
                In DeFi world, we often encounter yields that are high or low.
                These yields fluctuate within a certain range, thereby affecting
                our earnings. For example, if you deposited SUI into Scallop in
                April 2024, the APY was around 20% at that time. While in July
                2024, the APY was around 7.5% . How to amplify your earnings
                amid the fluctuates in yield? Nemo can help you achieve this.
              </p>
              <a
                href="https://docs.nemoprotocol.com/"
                className="px-3 py-2 rounded-2xl bg-[#64ABFF] text-white/70 w-[108px] text-xs text-center hover:!text-white active:!text-white mt-4"
              >
                Learn More
              </a>
            </div>
            <img src={Blcok} alt="block" className="w-[200px] h-[200px]" />
          </div>
        </div>
        <motion.div
          className="mt-[30px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-all duration-200 ease-in-out"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {list?.map((item) => (
            <motion.div
              key={item.coinAddress + "_" + item.maturity}
              className="p-5 rounded-3xl"
              style={{ background: item?.bgGradient || "#0E0F16" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2.5 items-start">
                  <div className="flex items-center gap-x-2">
                    <h6 className="text-white">{item.coinName}</h6>
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
                <div className="mt-6 flex items-center justify-between rounded-xl p-4 bg-[#131520] hidden">
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
                    className="px-2 py-1.5 bg-[#0F60FF] rounded-xl flex items-center justify-between pl-5 pr-3 h-14 cursor-pointer border border-transparent hover:border-white"
                    onClick={() =>
                      navigate(
                        `/market/detail/${item.coinAddress}/${item.maturity}/swap/buy/yt`,
                      )
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
                    className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black pl-5 pr-3 h-14 cursor-pointer border border-transparent hover:border-white"
                    onClick={() =>
                      navigate(
                        `/market/detail/${item.coinAddress}/${item.maturity}/swap/buy/pt`,
                      )
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
                  className="mt-2.5 py-3 pl-7 pr-4.5 flex items-center justify-between text-sm bg-[#62CAFF] w-full text-black h-14 rounded-xl cursor-pointer border border-transparent hover:border-white"
                  onClick={() =>
                    navigate(
                      `/market/detail/${item.coinAddress}/${item.maturity}/liquidity`,
                    )
                  }
                >
                  <span>+ POOL APY</span>
                  <span className="text-base">
                    {new Decimal(item.poolApy).toFixed(2)}%
                  </span>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  )
}
