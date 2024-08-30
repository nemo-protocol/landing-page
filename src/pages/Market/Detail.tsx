import { useState } from "react"
import logo from "@/assets/images/svg/logo.svg"
import Network from "@/assets/images/svg/network.svg"
import LeftArrow from "@/assets/images/svg/left-arrow.svg"
import Loading from "@/assets/images/svg/loading.svg"
import Swtich from "@/assets/images/svg/swtich.svg"
import Wallet from "@/assets/images/svg/wallet.svg"
import sSUI from "@/assets/images/svg/sSUI.svg"
import DownArrow from "@/assets/images/svg/down-arrow.svg"
import Add from "@/assets/images/svg/add.svg"
import Swap from "@/assets/images/svg/swap.svg"
import { useNavigate } from "react-router-dom"

import { useToast } from "@/components/ui/use-toast"

export default function Home() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [router, setRouter] = useState<string>("Markets")

  return (
    <div className="min-h-screen max-w-[1440px] mx-auto">
      <header className="w-full mx-auto py-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-x-6">
          <img src={logo} alt="" />
          <ul className="flex items-center">
            <li
              onClick={() => setRouter("Markets")}
              className={[
                "w-24 text-center bg-transparent py-2 rounded-full cursor-pointer",
                router === "Markets" ? "text-white" : "text-white/50",
              ].join(" ")}
            >
              Markets
            </li>
            <li
              onClick={() => {
                toast({
                  title: "Coming soon!",
                })
              }}
              className={[
                "w-24 text-center bg-transparent py-2 rounded-full cursor-pointer",
                router === "Portfolio" ? "text-white" : "text-white/50",
              ].join(" ")}
            >
              Portfolio
            </li>
            <li
              onClick={() => {
                toast({
                  title: "Coming soon!",
                })
              }}
              className={[
                "w-24 text-center bg-transparent py-2 rounded-full cursor-pointer",
                router === "Learn" ? "text-white" : "text-white/50",
              ].join(" ")}
            >
              Learn
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-x-6">
          <img src={Network} alt="" />
          <button
            className="bg-[#0052F2] text-white px-3 py-2 rounded-full"
            onClick={() => {
              toast({
                title: "Coming soon!",
              })
            }}
          >
            Connect Wallet
          </button>
        </div>
      </header>

      <div className="py-10 relative">
        <h3
          className="text-lg text-white flex items-center gap-x-2 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <img src={LeftArrow} /> <span>All Markets</span>
        </h3>
        <div className="mt-9 flex gap-x-8">
          <div className="w-[360px] flex flex-col gap-y-5">
            <div className="w-full flex items-center h-[50px] bg-[#0E0F16] rounded-[40px]">
              <div className="flex-1 bg-[#0F60FF] rounded-[40px] h-full flex items-center justify-center">
                Trade
              </div>
              <div className="flex-1 h-full flex items-center justify-center">
                Liquidity
              </div>
            </div>
            <div className="w-full bg-[#0E0F16] rounded-[40px] px-5 py-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-7">
                  <span className="text-white">Swap</span>
                  <span className="text-white/50">Mint</span>
                </div>
                <div className="flex items-center gap-x-2 w-auto">
                  <img src={Loading} alt="" />
                  <div className="flex items-center gap-x-2 bg-[#242632]/30 rounded-md py-1.5 px-2.5">
                    <img src={Swtich} alt="" />
                    <span className="text-white">0.5%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center rounded-[40px] w-40 my-6 bg-[#242632]">
                <div className="bg-[#0F60FF] text-white text-sm flex-1 py-1.5 rounded-[40px] flex items-center justify-center">
                  Mint
                </div>
                <div className="text-white flex-1 py-1.5 text-sm flex items-center justify-center">
                  Redeem
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-white">Input</div>
                <div className="flex items-center gap-x-1">
                  <img src={Wallet} alt="" />
                  <span>Balance:1998.45</span>
                </div>
              </div>
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
              <div className="flex items-center gap-x-2 justify-end mt-3.5">
                <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">
                  Harlf
                </div>
                <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">
                  Max
                </div>
              </div>
              <img src={Swap} alt="" className="mx-auto mt-5" />
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
              <img src={Add} alt="" className="mx-auto mt-5" />
              <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
                <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
                  <img src={sSUI} alt="" className="size-6" />
                  <span>SSUI</span>
                  <img src={DownArrow} alt="" />
                </div>
                <input
                  type="text"
                  className="bg-transparent h-full outline-none"
                />
              </div>
            </div>
          </div>
          <div className="grow ">
            <div className="w-full px-10 py-6 flex items-center justify-between bg-[#0E0F16] rounded-3xl">
              <div className="flex items-center gap-x-4">
                <img src={sSUI} alt="" className="size-[60px]" />
                <div className="flex flex-col">
                  <span className="text-white text-lg">PT sSUI</span>
                  <span className="text-white text-xs">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">$232,523,76.36</span>
                <span className="text-white/50 text-xs">TVL</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">Apr 24 2025</span>
                <span className="text-white/50 text-xs">Maturity</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">3.56%</span>
                <span className="text-white/50 text-xs">Underlying APY</span>
              </div>
              <div className="flex flex-col gap-y-2 items-center justify-center">
                <span className="text-white text-lg">6.66%</span>
                <span className="text-white/50 text-xs">Fixed APY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
