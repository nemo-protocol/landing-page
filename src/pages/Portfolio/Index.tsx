import List from "./List"
import Header from "@/components/Header"
import { Eye, Plus } from "lucide-react"
import { usePortfolioList } from "@/queries"
import BalanceIcon from "@/assets/images/svg/balance.svg?react"
import RewardsIcon from "@/assets/images/svg/reward.svg?react"
import usePortfolio from "@/hooks/usePortfolio"
import Decimal from "decimal.js"

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
        <div className="flex items-center justify-between">
          <div>
            <h6 className="flex items-center gap-x-2">
              <span className="text-xl">My Portfolio</span>
              <Eye className="size-3.5 hidden" />
            </h6>
            <div className="flex items-center gap-x-16 py-4">
              <div className="flex items-center gap-x-4">
                <BalanceIcon />
                <div className="flex flex-col gap-y-2">
                  <span className="text-white/60 text-xs">Current balance</span>
                  <span className="text-white">
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
              </div>
              <div className="flex items-center gap-x-4">
                <RewardsIcon />
                <div className="flex flex-col gap-y-2">
                  <span className="text-white/60 text-xs">
                    My Claimable Yield & Rewards
                  </span>
                  <div className="flex items-center gap-x-2">
                    <span className="text-white">
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
              </div>
            </div>
          </div>
          <button className="bg-[#0F60FF] px-6 py-2.5 rounded-3xl flex items-center hidden">
            <Plus />
            <span>Add transaction</span>
          </button>
        </div>
        <List list={list} />
      </div>
    </>
  )
}
