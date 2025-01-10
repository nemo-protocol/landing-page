import dayjs from "dayjs"
import { motion } from "framer-motion"
import Header from "@/components/Header"
import { useCoinInfoList } from "@/queries"
import PieChart from "./components/PieChart.tsx"
import { Link, useNavigate } from "react-router-dom"
import Loading from "@/components/Loading"
import { formatTimeDiff } from "@/lib/utils"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import { CoinInfo } from "@/queries/types/market"

const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

interface MarketItemProps {
  item: CoinInfo
  navigate: (path: string) => void
}

const MarketItem = ({ item, navigate }: MarketItemProps) => {
  const { data: ptYtData } = useCalculatePtYt(item)
  return (
    <div
      key={item.coinType + "_" + item.maturity}
      className="border border-white/10 rounded-3xl"
    >
      <motion.div
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
            <div className="rounded-full bg-white bg-opacity-5 py-1 px-2 flex items-center gap-x-2">
              <img
                alt="scallop"
                className="size-4 block"
                src={item.providerLogo}
              />
              <span className="text-xs">{item.provider}</span>
            </div>
          </div>
          <img src={item.coinLogo} alt={item.coinName} className="size-14" />
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
                  {formatTimeDiff(parseInt(item.maturity))}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#576682] text-xs">TVL</span>
            <div className="flex items-center gap-x-2">
              <span className="text-white text-xs font-bold">
                ${ptYtData?.tvl.toFixed(6) || "--"}
              </span>
              <PieChart marketStateId={item.marketStateId} />
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
                  `/market/detail/${item.coinType}/${item.maturity}/swap/yt`,
                )
              }
            >
              <span className="text-white text-sm">YT</span>
              <div className="flex flex-col items-end">
                <span className="text-base text-white">
                  {ptYtData?.ytApy || "--"}%
                </span>
                <span className="text-xs text-white">
                  ${ptYtData?.ytPrice?.toFixed(10) || "--"}
                </span>
              </div>
            </div>
            <div
              className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black pl-5 pr-3 h-14 cursor-pointer border border-transparent hover:border-white"
              onClick={() =>
                navigate(
                  `/market/detail/${item.coinType}/${item.maturity}/swap/pt`,
                )
              }
            >
              <span className="text-sm">PT</span>
              <div className="flex flex-col items-end">
                <span className="text-base">{ptYtData?.ptApy || "--"}%</span>
                <span className="text-xs">
                  ${ptYtData?.ptPrice?.toFixed(10) || "--"}
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
              navigate(`/market/detail/${item.coinType}/${item.maturity}/add`)
            }
          >
            <span>+ POOL APY</span>
            <span className="text-base">
              {ptYtData?.poolApy.toFixed(6) || "--"}%
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: list, isLoading } = useCoinInfoList()

  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 md:px-8 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="py-4 sm:py-10 relative xl:max-w-[1200px] xl:mx-auto px-4 md:px-8 xl:px-0">
        <div className="flex flex-col-reverse gap-x-8 lg:flex-row lg:items-center gap-y-8 lg:gap-y-0 lg:justify-between">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={textVariants}
            transition={{ duration: 0.5 }}
            className="max-w-[584px]"
          >
            <h3 className="text-[28px] text-white font-black sm:text-[24px] text-lg">
              Market
            </h3>
            <h6 className="text-white/70 md:mt-8 mt-4">
              Dive into the yield trading market and maximize your profit
              potential.
            </h6>
            <p className="text-white/70 sm:text-sm space-x-2">
              <span>Learn More</span>
              <Link
                to="/learn"
                className="underline text-white/70 underline-offset-2"
              >
                About PT & YT Trading
              </Link>
            </p>
          </motion.div>
        </div>
        {isLoading ? (
          <Loading className="mt-[30px] min-h-[200px]" />
        ) : (
          <motion.div
            className="mt-[30px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-all duration-200 ease-in-out"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {list?.map((item) => (
              <MarketItem
                key={item.coinType + "_" + item.maturity}
                item={item}
                navigate={navigate}
              />
            ))}
          </motion.div>
        )}
      </div>
    </>
  )
}
