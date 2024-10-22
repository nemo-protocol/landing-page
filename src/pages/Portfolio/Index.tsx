import List from "./List"
import BalanceIcon from "@/assets/images/svg/balance.svg?react"
import RewardsIcon from "@/assets/images/svg/reward.svg?react"
import Header from "@/components/Header"
import { Eye, Plus } from "lucide-react"

export default function Portfolio() {
  return (
    <>
      <Header />

      <div className="py-10 px-6 xl:px-0 space-y-4">
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
                  <span>Current balance</span>
                  <span>$14,257.89</span>
                </div>
              </div>
              <div className="flex items-center gap-x-4">
                <RewardsIcon />
                <div className="flex flex-col gap-y-2">
                  <span>My Claimable Yield & Rewards</span>
                  <div className="flex items-center gap-x-2">
                    <span>$14,257.89</span>
                    <button className="rounded-3xl bg-[#0F60FF] py-1 px-2">
                      Claim
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
        <List />
      </div>
    </>
  )
}
