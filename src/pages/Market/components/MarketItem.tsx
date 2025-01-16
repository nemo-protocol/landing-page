import dayjs from "dayjs"
import { motion } from "framer-motion"
import PieChart from "./PieChart"
import { useNavigate } from "react-router-dom"
import { CoinInfoWithMetrics } from "@/queries/types/market"
import { formatLargeNumber, formatTimeDiff } from "@/lib/utils"

interface MarketItemProps {
  item: CoinInfoWithMetrics
}

const MarketItem = ({ item }: MarketItemProps) => {
  const navigate = useNavigate()

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
                {item.tvl ? `$${formatLargeNumber(item.tvl, 6)}` : "--"}
              </span>
              <PieChart marketState={item.marketState} />
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
                <span className="text-sm text-white">
                  {item.ytApy ? `${formatLargeNumber(item.ytApy, 6)}%` : "--"}
                </span>
                <span className="text-xs text-white">
                  {item.ytPrice
                    ? `$${formatLargeNumber(item.ytPrice, 6)}`
                    : "--"}
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
                <span className="text-sm">
                  {item.ptApy ? `${formatLargeNumber(item.ptApy, 6)}%` : "--"}
                </span>
                <span className="text-xs">
                  {item.ptPrice
                    ? `$${formatLargeNumber(item.ptPrice, 6)}`
                    : "--"}
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
              {item.poolApy ? `${formatLargeNumber(item.poolApy, 6)}%` : "--"}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default MarketItem
