import List from "./List"
import Header from "@/components/Header"
import { Eye } from "lucide-react"
import { usePortfolioList } from "@/queries"
import usePortfolio from "@/hooks/usePortfolio"
import Decimal from "decimal.js"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import CountUp from "react-countup"
import { cn } from "@/lib/utils"

// 创建一个滚动数字组件
const AnimatedNumber = ({
  value,
  className = "",
}: {
  value: number
  className?: string
}) => {
  return (
    <span className={cn(className)}>
      $
      <CountUp
        end={value}
        separator=","
        decimals={2}
        duration={1.5}
        preserveValue={true}
      />
    </span>
  )
}

export default function Portfolio() {
  const { data: list, isLoading } = usePortfolioList()
  const { portfolios } = usePortfolio()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const balance = portfolios
    .reduce((sum, portfolio) => sum.add(portfolio.balance), new Decimal(0))
    .toNumber()

  const reward = portfolios
    .reduce((sum, portfolio) => sum.add(portfolio.reward), new Decimal(0))
    .toNumber()

  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>

      <div className="py-4 sm:py-10 px-4 xl:px-0 space-y-4 xl:max-w-[1200px] xl:mx-auto">
        <div className="w-full">
          <motion.h6
            className="flex items-center gap-x-2 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[22px] sm:text-[28px] font-black">
              My Portfolio
            </span>
            <Eye className="size-3.5 hidden" />
          </motion.h6>
          {isMobile ? (
            // Mobile View - Card Layout
            <div className="space-y-4">
              <motion.div
                className="rounded-xl p-4 bg-gradient-to-r from-[#072120] to-[#050908] border border-white/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-white/60 text-xs">
                      Current balance
                    </span>
                    <AnimatedNumber
                      value={balance}
                      className="text-white text-lg"
                    />
                  </div>
                  <img
                    src="/images/svg/balance.svg"
                    alt="balance"
                    className="size-10"
                  />
                </div>
              </motion.div>

              <motion.div
                className="rounded-xl p-4 bg-gradient-to-r from-[rgba(14,15,22,0.65)] to-[rgba(3,91,250,0.19)] border border-white/5 hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-white/60 text-xs">
                      My Claimable Yield & Rewards
                    </span>
                    <AnimatedNumber
                      value={reward}
                      className="text-white text-lg"
                    />
                  </div>
                  <img
                    src="/images/svg/reward.svg"
                    alt="reward"
                    className="size-10"
                  />
                </div>
              </motion.div>
            </div>
          ) : (
            // Desktop View - Original Layout
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row items-stretch md:items-center justify-between">
              <div className="w-full md:w-fit flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-5">
                <motion.div
                  className="flex items-center justify-between gap-x-4 px-4 sm:px-5 py-4 sm:py-6 rounded-2xl sm:rounded-3xl w-full md:w-[360px] h-[100px] sm:h-[120px] border border-white/5"
                  style={{
                    background:
                      "linear-gradient(240deg, #072120 -7.71%, #050908 68.1%)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="flex flex-col gap-y-2">
                    <span className="text-white/60 text-[10px] sm:text-xs">
                      Current balance
                    </span>
                    <AnimatedNumber
                      value={balance}
                      className="text-white text-lg sm:text-2xl"
                    />
                  </div>
                  <img
                    src="/images/svg/balance.svg"
                    alt="balance"
                    className="size-[48px] sm:size-[58px]"
                  />
                </motion.div>

                <motion.div
                  className="flex items-center justify-between gap-x-4 px-4 sm:px-5 py-4 sm:py-6 rounded-2xl sm:rounded-3xl w-full md:w-[360px] h-[100px] sm:h-[120px] border border-white/5 hidden"
                  style={{
                    background:
                      "linear-gradient(45deg, rgba(14, 15, 22, 0.65) 27.28%, rgba(3, 91, 250, 0.19) 124.06%)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <div className="flex flex-col gap-y-2">
                    <span className="text-white/60 text-[10px] sm:text-xs">
                      My Claimable Yield & Rewards
                    </span>
                    <div className="flex items-center gap-x-2">
                      <AnimatedNumber
                        value={reward}
                        className="text-white text-lg sm:text-2xl"
                      />
                      <button className="rounded-3xl bg-[#0F60FF] py-1 px-2 text-xs hidden">
                        Claim All
                      </button>
                    </div>
                  </div>
                  <img
                    src="/images/svg/reward.svg"
                    alt="reward"
                    className="size-[48px] sm:size-[58px]"
                  />
                </motion.div>
              </div>
            </div>
          )}
        </div>
        <List list={list} isLoading={isLoading} />
      </div>
    </>
  )
}
