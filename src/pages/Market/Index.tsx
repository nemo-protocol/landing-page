import { useState } from "react";
import logo from "@/assets/images/svg/logo.svg";
import sUSDC from "@/assets/images/svg/sUSDC.svg";
import Scallop from "@/assets/images/svg/Scallop.svg";
import Network from "@/assets/images/svg/network.svg";
import Diamond from "@/assets/images/svg/market/diamond.svg";
import Crown from "@/assets/images/svg/market/crown.svg";
import Star from "@/assets/images/svg/market/star.svg";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { toast } = useToast();
  const [router, setRouter] = useState<string>("Markets");
  const navigate = useNavigate();

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
                });
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
                });
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
              });
            }}
          >
            Connect Wallet
          </button>
        </div>
      </header>

      <div className="py-10 relative">
        <h3 className="text-[28px] text-white">Markets</h3>
        <h6 className="text-sm text-white mt-8">
          Exit Anytime At <span className="text-[#0052F2]">Market Price.</span>{" "}
        </h6>
        <p className="text-white">
          Learn More About <span className="underline">PT & YT Trading,</span>{" "}
          Or Simply Add <span className="underline">Liquidity And Earn.</span>{" "}
        </p>
        <div className="flex items-center gap-x-2 mt-9">
          <button className="border border-[#0052F2] bg-[#0052F2]/25 text-[#5D94FF] py-1.5 px-3 rounded-full flex items-center gap-x-1">
            <img src={Diamond} alt="" /> <span className="text-xs">All</span>
          </button>
          <button className="border border-[#C2B166] bg-[#C2B166]/25 text-[#C2B166] py-1.5 px-3 rounded-full flex items-center gap-x-1">
            <img src={Star} alt="" /> <span className="text-xs">New</span>
          </button>
          <button className="border border-[#2DF4DD] bg-[#2DF4DD]/25 text-[#2DF4DD] py-1.5 px-3 rounded-full flex items-center gap-x-1">
            <img src={Crown} alt="" className="inline-block" />
            <span className="text-xs">Popular</span>
          </button>
        </div>
        <div className="mt-[23px] grid grid-cols-4 gap-8">
          {Array.from({ length: 12 }, () => (
            <div
              className="p-[24.44px] rounded-[21.544px] bg-[#1D1D1D] h-[422px]"
              onClick={() => navigate("/market/detail")}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2.5">
                  <h6 className="text-white">sUSDC</h6>
                  <div className="rounded-full bg-[#292929] py-0.5 px-1 flex items-center gap-x-0.5">
                    <img src={Scallop} alt="" className="w-3.5" />
                    <span className="text-xs scale-75">Scallop</span>
                  </div>
                </div>
                <img src={sUSDC} alt="sUSDC" className="mr-2.5" />
              </div>
              <div className="py-3 px-3.5 rounded-xl bg-[#292929] mt-6">
                <div className="flex items-center justify-between">
                  <h6 className="text-white/60 scale-75">TVL</h6>
                  <div className="rounded-full bg-[#383838] py-0.5 px-4 scale-75 origin-right text-white">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </div>
                </div>
                <p className="mt-1.5 text-white">$10,623,44</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white/60">Underlying Price</div>
                    <div className="text-white">$1.00</div>
                  </div>
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white/60">Underlying Apy</div>
                    <div className="text-white">6.88%</div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs text-white">Trade</h6>
                <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                  <div className="px-4 py-3 bg-[#0F60FF] rounded-xl flex items-center justify-between">
                    <span className="text-white">YT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-white">1.32%</span>
                      <span className="text-xs text-white">$0.065</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black">
                    <span>PT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm">7.05%</span>
                      <span className="text-xs">$0.94</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs">Earn</h6>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span>+ POOL APY</span>
                  <span>7.23%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
