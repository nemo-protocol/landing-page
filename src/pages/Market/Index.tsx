import Diamond from "@/assets/images/svg/market/diamond.svg"
import Crown from "@/assets/images/svg/market/crown.svg"
import Star from "@/assets/images/svg/market/star.svg"
import { Link, useNavigate } from "react-router-dom"
import Header from "@/components/Header"
import { useCoinInfoList } from "@/queries"
import Logo from "@/assets/images/svg/market/logo.svg?react"

export default function Home() {
  const navigate = useNavigate()
  const { data: list } = useCoinInfoList()

  return (
    <div className="min-h-screen xl:max-w-[1440px] xl:mx-auto w-full">
      <Header />

      <div className="py-10 relative px-7.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[28px] text-white">Markets</h3>
            <h6 className="text-white mt-8">
              Exit Anytime At&nbsp;
              <span className="text-[#0052F2]">Market Price.</span>&nbsp;
            </h6>
            <p className="text-white">
              Learn More About&nbsp;
              <Link to="/learn" className="underline">
                PT & YT Trading
              </Link>
              &nbsp;Or Simply&nbsp;
              <span className="underline">Add Liquidity and Earn.</span>
            </p>
            <div className="flex items-center gap-x-2 mt-9">
              <button className="border border-[#0052F2] bg-[#0052F2]/25 text-[#5D94FF] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Diamond} alt="" />{" "}
                <span className="text-xs">All</span>
              </button>
              <button className="border border-[#C2B166] bg-[#C2B166]/25 text-[#C2B166] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Star} alt="" /> <span className="text-xs">New</span>
              </button>
              <button className="border border-[#2DF4DD] bg-[#2DF4DD]/25 text-[#2DF4DD] py-1.5 px-3 rounded-full flex items-center gap-x-1">
                <img src={Crown} alt="" className="inline-block" />
                <span className="text-xs">Popular</span>
              </button>
            </div>
          </div>
          <Logo />
        </div>
        <div className="mt-[23px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {list?.map((item) => (
            <div
              key={item.coinAddress}
              className="p-[24.44px] rounded-[21.544px] bg-[#0E0F16] cursor-pointer"
              onClick={() => navigate("/market/detail")}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2.5">
                  <h6 className="text-white">{item.coinName}</h6>
                  <div className="rounded-full bg-[#292929] py-0.5 px-2 flex items-center gap-x-2">
                    <img
                      src={item.providerLogo}
                      alt="scallop"
                      className="w-6"
                    />
                    <span className="text-xs">{item.provider}</span>
                  </div>
                </div>
                <img
                  src={item.coinLogo}
                  alt="sUSDC"
                  className="size-14 mr-2.5"
                />
              </div>
              <div className="py-3 px-3.5 rounded-xl bg-[#131520] mt-6">
                <div className="flex items-center justify-between">
                  <h6 className="text-white/60 scale-75">TVL</h6>
                  <div className="rounded-full bg-[#383838] py-0.5 px-4 scale-75 origin-right text-white">
                    28 Aug 2024 <span className="text-[#2DF4DD]">41 DAYS</span>
                  </div>
                </div>
                <p className="mt-1.5 text-white">
                  ${item.tvl.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white/60 text-xs">
                      Underlying Price
                    </div>
                    <div className="text-white">
                      ${item.underlyingPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-y-1">
                    <div className="text-white/60 text-xs">Underlying Apy</div>
                    <div className="text-white">
                      {(
                        Math.ceil(Number(item.underlyingApy) * 100) / 100
                      ).toFixed(2)}
                      %
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs text-white">Trade</h6>
                <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                  <div className="px-2 py-1.5 bg-[#0F60FF] rounded-xl flex items-center justify-between">
                    <span className="text-white">YT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-white">
                        {(Math.ceil(Number(item.ytApy) * 100) / 100).toFixed(2)}
                        %
                      </span>
                      <span className="text-xs text-white">
                        ${item.ytPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black">
                    <span>PT</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm">
                        {(Math.ceil(Number(item.ptApy) * 100) / 100).toFixed(2)}
                        %
                      </span>
                      <span className="text-xs">
                        ${item.ptPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <h6 className="text-xs">Earn</h6>
                <button className="mt-2.5 py-3 px-7 flex items-center justify-between text-xs bg-[#62CAFF] w-full text-black">
                  <span>+ POOL APY</span>
                  <span>
                    {(Math.ceil(Number(item.poolApy) * 100) / 100).toFixed(2)}%
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
