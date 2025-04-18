import dayjs from "dayjs"
import PieChart from "./PieChart"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { getBgGradient } from "@/lib/gradients"
import { CoinInfoWithMetrics } from "@/queries/types/market"
import { formatLargeNumber, formatTimeDiff, isValidAmount } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useState, useEffect, useRef } from "react"

interface MarketItemProps {
  item: CoinInfoWithMetrics
}

const MarketItem = ({ item }: MarketItemProps) => {
  console.log("item", item)

  const navigate = useNavigate()
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleTooltipClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent button click event (navigation)
    e.preventDefault() // Prevent any default behavior
    setTooltipOpen(!tooltipOpen)
  }

  const handleNavigate = () => {
    navigate(`/market/detail/${item.coinType}/${item.maturity}/add`)
  }

  // Handle clicking outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setTooltipOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <TooltipProvider>
      <div
        key={item.coinType + "_" + item.maturity}
        className="border border-white/10 rounded-3xl"
      >
        <motion.div
          className="p-5 rounded-3xl"
          style={{ background: getBgGradient(item.coinType) }}
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
                {isValidAmount(item.marketState.marketCap) && (
                  <PieChart marketState={item.marketState} />
                )}
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
                    {item.ytApy ? `${formatLargeNumber(item.ytApy, 2)}%` : "--"}
                  </span>
                  <span className="text-xs text-white">
                    {item.ytPrice
                      ? `$${formatLargeNumber(item.ytPrice, 4)}`
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
                    {item.ptApy ? `${formatLargeNumber(item.ptApy, 2)}%` : "--"}
                  </span>
                  <span className="text-xs">
                    {item.ptPrice
                      ? `$${formatLargeNumber(item.ptPrice, 4)}`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3.5">
            <h6 className="text-xs">Earn</h6>
            <div ref={tooltipRef}>
              <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
                <TooltipTrigger asChild>
                  <button
                    className={`mt-2.5 py-3 pl-7 pr-4.5 flex items-center justify-between text-sm bg-[#62CAFF] w-full text-black h-14 rounded-xl cursor-pointer border ${tooltipOpen ? "border-white" : "border-transparent hover:border-white"}`}
                    onClick={handleNavigate}
                  >
                    <span
                      className={`underline cursor-pointer ${tooltipOpen ? "font-bold" : ""}`}
                      onClick={handleTooltipClick}
                    >
                      + POOL APY
                    </span>
                    <div className="flex flex-row items-center gap-1.5">
                      {item.poolApy
                        ? `${formatLargeNumber(item.poolApy, 2)}%`
                        : "--"}
                      {item.marketState.rewardMetrics?.length ? (
                        <img
                          src="/images/market/gift.png"
                          alt=""
                          className="size-4"
                        />
                      ) : null}
                      {item.perPoints ? (
                        <img
                          src="/images/png/star.png"
                          alt=""
                          className="size-3.5"
                        />
                      ) : null}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[#1B202A] text-white border-none p-4 relative rounded-xl w-[312px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-4">
                    {item.perPoints && (
                      <div className="flex flex-row items-start justify-between">
                        <span className="text-sm text-left">Points</span>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1">
                            <img
                              src="/images/png/star.png"
                              alt=""
                              className="size-3"
                            />
                            <span className="font-mono text-xs">
                              {formatLargeNumber(item.perPoints, 6)}
                            </span>
                          </div>
                          <div className="flex flex-row items-center gap-1 text-xs">
                            <span className="text-white">
                              {item.boost}x boost
                            </span>
                            <span className="text-[#96A9E4] text-xs">
                              per LP per day
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-left">Scaled</div>
                      <div className="relative flex flex-row gap-2">
                        <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                        <div className="absolute -bottom-1 left-0 top-0 w-[1px] bg-[#41517A]"></div>
                        <div className="flex flex-1 flex-row items-start justify-between gap-4">
                          <div className="flex flex-row items-center gap-1.5">
                            <span className="text-[#96A9E4] text-xs">
                              PT APY
                            </span>
                          </div>
                          <span className="font-mono text-xs">
                            {item.scaledPtApy
                              ? `${formatLargeNumber(item.scaledPtApy, 6)}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                      <div className="relative flex flex-row gap-2">
                        <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                        <div className="absolute -bottom-1 left-0 top-0 w-[1px] bg-[#41517A]"></div>
                        <div className="flex flex-1 flex-row items-start justify-between gap-4">
                          <div className="flex flex-row items-center gap-1.5">
                            <span className="text-[#96A9E4] text-xs">
                              Underlying APY
                            </span>
                          </div>
                          <span className="font-mono text-xs">
                            {item.scaledUnderlyingApy
                              ? `${formatLargeNumber(item.scaledUnderlyingApy, 6)}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                      <div className="relative flex flex-row gap-2">
                        <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                        <div className="flex flex-1 flex-row items-start justify-between gap-4">
                          <div className="flex flex-row items-center gap-1.5">
                            <span className="text-[#96A9E4] text-xs">
                              Swap Fee APY
                            </span>
                          </div>
                          <span className="font-mono text-xs">
                            {item.swapFeeApy
                              ? `${formatLargeNumber(item.swapFeeApy, 6)}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-start justify-between">
                      {isValidAmount(item.feeApy) && (
                        <>
                          <span className="text-sm text-left">Fee APY</span>
                          <span className="font-mono text-xs">
                            {item.feeApy
                              ? `${formatLargeNumber(item.feeApy, 6)}%`
                              : "--"}
                          </span>
                        </>
                      )}
                    </div>
                    {item.incentives && item.incentives.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-left">Incentive APY</div>
                        {item.incentives?.map((incentive, index) => (
                          <div
                            key={index}
                            className="relative flex flex-row gap-2"
                          >
                            <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                            <div className="flex flex-1 flex-row items-start justify-between gap-4">
                              <div className="flex flex-row items-center gap-1.5">
                                <span className="text-[#96A9E4] text-xs">
                                  Incentive
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={incentive.tokenLogo}
                                  alt=""
                                  className="size-4"
                                />
                                <span className="font-mono text-xs">
                                  {`${formatLargeNumber(incentive.apy, 6)}%`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-row items-center justify-between gap-4">
                      <span className="text-[#2DF4DD] text-sm">Total APY</span>
                      <span className="text-[#2DF4DD] font-mono text-sm">
                        {item.poolApy
                          ? `${formatLargeNumber(item.poolApy, 6)}%`
                          : "--"}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </div>
    </TooltipProvider>
  )
}

export default MarketItem
