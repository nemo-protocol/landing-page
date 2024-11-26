import List from "./List"
import Header from "@/components/Header"
import { Eye } from "lucide-react"
import { usePortfolioList } from "@/queries"
import BalanceIcon from "@/assets/images/svg/balance.svg?react"
import RewardsIcon from "@/assets/images/svg/reward.svg?react"
import usePortfolio from "@/hooks/usePortfolio"
import Decimal from "decimal.js"
import Income from "@/assets/images/svg/income.svg"
import { motion } from "framer-motion"

export default function Portfolio() {
  const { data: list } = usePortfolioList()
  const { portfolios } = usePortfolio()
  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-7.5 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>

      <div className="py-10 px-6 xl:px-0 space-y-4 xl:max-w-[1200px] xl:mx-auto">
        <div className="w-full">
          <motion.h6
            className="flex items-center gap-x-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[28px] font-black">My Portfolio</span>
            <Eye className="size-3.5 hidden" />
          </motion.h6>
          <div className="flex flex-row items-center justify-between py-4">
            <div className="w-full md:w-fit flex flex-col md:flex-row items-center gap-5">
              <motion.div
                className="flex items-center justify-between gap-x-4 px-5 py-6 rounded-3xl w-full md:w-[360px] h-[120px] border border-white/5"
                style={{
                  background:
                    "linear-gradient(240deg, #072120 -7.71%, #050908 68.1%)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex flex-col gap-y-2">
                  <span className="text-white/60 text-xs">Current balance</span>
                  <span className="text-white text-2xl">
                    $
                    {portfolios
                      .reduce(
                        (sum, portfolio) => sum.add(portfolio.balance),
                        new Decimal(0),
                      )
                      .toNumber()
                      .toLocaleString()}
                  </span>
                </div>
                <BalanceIcon />
              </motion.div>

              <motion.div
                className="flex items-center justify-between gap-x-4 px-5 py-6 rounded-3xl w-full md:w-[360px] h-[120px] border border-white/5"
                style={{
                  background:
                    "linear-gradient(45deg, rgba(14, 15, 22, 0.65) 27.28%, rgba(3, 91, 250, 0.19) 124.06%)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="flex flex-col gap-y-2">
                  <span className="text-white/60 text-xs">
                    My Claimable Yield & Rewards
                  </span>
                  <div className="flex items-center gap-x-2">
                    <span className="text-white text-2xl">
                      $
                      {portfolios
                        .reduce(
                          (sum, portfolio) => sum.add(portfolio.reward),
                          new Decimal(0),
                        )
                        .toNumber()
                        .toLocaleString()}
                    </span>
                    <button className="rounded-3xl bg-[#0F60FF] py-1 px-2 text-xs hidden">
                      Claim All
                    </button>
                  </div>
                </div>
                <RewardsIcon />
              </motion.div>
            </div>
            <motion.img
              src={Income}
              alt=""
              className="w-[200px] hidden lg:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            />
          </div>
        </div>
        <List list={list} />
      </div>
    </>
  )
}