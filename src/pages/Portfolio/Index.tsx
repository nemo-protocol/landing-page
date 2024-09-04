import List from "./List"
import { Eye, Plus } from "lucide-react"
import Header from "@/components/Header"
import { useNavigate } from "react-router-dom"
import SSUI from "@/assets/images/svg/sSUI.svg?react"
import SUSDC from "@/assets/images/svg/sUSDC.svg?react"
import Triangle from "@/assets/images/svg/triangle.svg?react"
import LeftArrow from "@/assets/images/svg/left-arrow.svg?react"

export default function Portfolio() {
  const navigate = useNavigate()

  return (
    <>
      <Header />

      <div className="py-10 relative px-6 xl:px-0">
        <h3
          onClick={() => navigate(-1)}
          className="text-lg text-white flex items-center gap-x-2 cursor-pointer"
        >
          <LeftArrow />
          <span>Back</span>
        </h3>
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="flex items-center gap-x-2">
                <span className="text-xs">Current balance</span>
                <Eye className="size-3.5" />
              </h6>
              <h4 className="text-3xl py-2.5">$14,257.89</h4>
              <h4 className="text-3xl flex items-center gap-x-2">
                <span className="text-sm text-[#FF7474]">
                  -$1200.78 (-1.89%)
                </span>
                <div className="py-1 px-1.5 bg-[#1A1D1E] text-xs rounded-2xl">
                  24H
                </div>
              </h4>
            </div>
            <button className="bg-[#0F60FF] px-6 py-2.5 rounded-3xl flex items-center">
              <Plus />
              <span>Add transaction</span>
            </button>
          </div>
          <div className="w-full py-6 mb-2 flex items-center justify-between rounded-3xl flex-col md:flex-row gap-y-5 md:gap-y-0">
            <div className="flex flex-row-reverse md:flex-col gap-y-2 w-full md:w-auto">
              <span className="text-white/60 text-xs">Total P&L</span>
              <span className=" flex items-center gap-x-1">
                <Triangle />
                <span className="text-sm text-[#44E0C3]">
                  10.52% (+$627.82)
                </span>
              </span>
            </div>
            <div className="flex items-center gap-x-2 w-full md:w-auto">
              <SSUI className="size-12" />
              <div className="flex flex-col gap-y-2">
                <span className="text-white/60 text-xs">PT sSUI</span>
                <span className=" flex items-center gap-x-1">
                  <Triangle />
                  <span className="text-sm text-[#44E0C3]">
                    10.52% (+$627.82)
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-2 w-full md:w-auto">
              <SSUI className="size-12" />
              <div className="flex flex-col gap-y-2">
                <span className="text-white/60 text-xs">YT sSUI</span>
                <span className=" flex items-center gap-x-1">
                  <Triangle />
                  <span className="text-sm text-[#44E0C3]">
                    10.52% (+$627.82)
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-2 w-full md:w-auto">
              <SUSDC className="size-12" />
              <div className="flex flex-col gap-y-2">
                <span className="text-white/60 text-xs">LP sUSDC</span>
                <span className=" flex items-center gap-x-1">
                  <Triangle />
                  <span className="text-sm text-[#44E0C3]">
                    10.52% (+$627.82)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <List />
      </div>
    </>
  )
}
