import { useState } from "react";
import bg1 from "@/assets/images/svg/bg-1.svg";
import PT from "@/assets/images/png/PT.png";
import YT from "@/assets/images/png/YT.png";
import Nemo from "@/assets/images/png/nemo.png";
import sSUI from "@/assets/images/svg/sSUI.svg";
import logo from "@/assets/images/svg/logo.svg";
import sUSDC from "@/assets/images/svg/sUSDC.svg";
import sUSDT from "@/assets/images/svg/sUSDT.svg";
import Scallop from "@/assets/images/svg/Scallop.svg";
import RightArrow from "@/assets/images/svg/right-arrow.svg";
import Assmbly from "@/assets/images/svg/TrustedBy/Assmbly.svg";
import Comma3 from "@/assets/images/svg/TrustedBy/Comma3.svg";
import Lbank from "@/assets/images/svg/TrustedBy/Lbank.svg";
import Web3fund from "@/assets/images/svg/TrustedBy/Web3fund.svg";
import Youbi from "@/assets/images/svg/TrustedBy/Youbi.svg";
import Sui from "@/assets/images/svg/Partners/SUI.svg";
import Cetus from "@/assets/images/svg/Partners/Cetus.svg";
import MoveBit from "@/assets/images/svg/MoveBit.svg";
import Twitter from "@/assets/images/svg/twitter.svg";
import X from "@/assets/images/svg/x.svg";
import { useToast } from "@/components/ui/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("Markets");
  const [router, setRouter] = useState<string>("Home");

  return (
    <div>
      <header className="max-w-[75rem] mx-auto py-6 flex items-center justify-between text-xs">
        <img src={logo} alt="" />
        <ul className="rounded-full border border-white/20 flex items-center">
          <li
            onClick={() => setRouter("Home")}
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Home" ? "bg-white/10" : "",
            ].join(" ")}
          >
            Home
          </li>
          <li
            onClick={() => setRouter("Community")}
            className={[
              "w-32 text-center text-white bg-transparent py-2 rounded-full cursor-pointer dropdown",
              router === "Community" ? "bg-white/10" : "",
            ].join(" ")}
          >
            <div tabIndex={0} role="button">
              Community
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-white/10 rounded-box z-[1] p-2 shadow mt-4 w-[130px]"
            >
              <li>
                <a
                  href="https://x.com/nemoprotocol"
                  target="_blank"
                  className="text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  className="text-white"
                  onClick={() => {
                    toast({
                      title: "Coming soon!",
                    });
                  }}
                >
                  Telegram
                </a>
              </li>
            </ul>
          </li>
          <li
            onClick={() => {
              toast({
                title: "Coming soon!",
              });
            }}
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Docs" ? "bg-white/10" : "",
            ].join(" ")}
          >
            Docs
          </li>
          <li
            onClick={() => {
              toast({
                title: "Coming soon!",
              });
            }}
            className={[
              "w-24 text-center text-white bg-transparent py-2 rounded-full cursor-pointer",
              router === "Learn" ? "bg-white/10" : "",
            ].join(" ")}
          >
            Learn
          </li>
        </ul>
        <button
          className="border border-white bg-transparent rounded-full"
          onClick={() => {
            toast({
              title: "Coming soon!",
            });
          }}
        >
          Launch App
        </button>
      </header>

      <div
        style={{ backgroundImage: `url(${bg1})` }}
        className="h-[68.125rem] pt-[7.125rem] relative"
      >
        <div className="max-w-[75rem] mx-auto flex flex-col">
          <h1 className="text-5xl text-center">
            Yield <span className="text-[#65A2FF]">Trading</span> For Everyone
          </h1>
          <h6 className="text-center mt-4">
            Revolutionizing investment strategy and maximize returns with yield
            trading.
          </h6>
          <div className="flex items-center justify-center gap-x-5 text-white mt-10">
            <button
              className="bg-[#1954FF] flex items-center gap-x-4 rounded-full"
              onClick={() => {
                toast({
                  title: "Coming soon!",
                });
              }}
            >
              <span>Enter Now</span>
              <img src={RightArrow} alt="" />
            </button>
            <button
              className="rounded-full border border-white"
              onClick={() => {
                toast({
                  title: "Coming soon!",
                });
              }}
            >
              Learn More
            </button>
          </div>

          <div className="mt-[5.0625rem] border border-white border-b-0 rounded-[33px] flex flex-col pt-[34px]">
            <div className="pl-[49px]">
              <div className="rounded-full grid grid-cols-3 bg-[#1D1D1D] w-[20.75rem] py-3 mx-auto">
                <div
                  onClick={() => setTab("Markets")}
                  className={[
                    "text-center cursor-pointer",
                    tab === "Markets" ? "text-white" : "text-white/50",
                  ].join(" ")}
                >
                  Markets
                </div>
                <div
                  // onClick={() => setTab("Portfolio")}
                  className={[
                    "text-center cursor-not-allowed",
                    tab === "Portfolio" ? "text-white" : "text-white/50",
                  ].join(" ")}
                >
                  Portfolio
                </div>
                <div
                  // onClick={() => setTab("Learn")}
                  className={[
                    "text-center cursor-not-allowed",
                    tab === "Learn" ? "text-white" : "text-white/50",
                  ].join(" ")}
                >
                  Learn
                </div>
              </div>
              <h4 className="text-2xl">Markets</h4>
              {/* <p className="text-xs mt-5">
                Exit Anytime At{" "}
                <span className="text-[#0052F2]">market price.</span>
              </p> */}
              {/* <p className="text-xs">
                Learn More{" "}
                <span className="underline">About PT & YT trading</span>，Or{" "}
                <span className="underline">Simply Add Liquidity And Earn</span>
                .
              </p> */}
              <div className="flex items-center gap-x-3 mt-[26px]">
                <button className="border border-[#0052F2] bg-[#0052F2]/25 text-[#0052F2] py-2 px-3 rounded-full">
                  Learn PT
                </button>
                <button className="border border-[#2DF4DD] bg-[#2DF4DD]/25 text-[#2DF4DD] py-2 px-3 rounded-full">
                  Learn YT
                </button>
                <button className="border border-[#C2B166] bg-[#C2B166]/25 text-[#C2B166] py-2 px-3 rounded-full">
                  Earn
                </button>
              </div>
            </div>
            <div className="mt-[23px] grid grid-cols-3 gap-x-8 pr-5">
              <div className="p-[24.44px] rounded-[21.544px] bg-[#1D1D1D] h-[422px] -rotate-[5deg] mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-y-2.5">
                    <h6>sSUI</h6>
                    <div className="rounded-full bg-[#292929] py-0.5 px-1 flex items-center gap-x-0.5">
                      <img src={Scallop} alt="" className="w-3.5" />
                      <span className="text-xs scale-75">Scallop</span>
                    </div>
                  </div>
                  <img src={sSUI} alt="sSUI" className="mr-2.5" />
                </div>
                <div className="py-3 px-3.5 rounded-xl bg-[#292929] mt-6">
                  <div className="flex items-center justify-between">
                    <h6 className="text-white/60 scale-75">TVL</h6>
                    <div className="rounded-full bg-[#383838] py-0.5 px-4 scale-75 origin-right">
                      28 Aug 2024{" "}
                      <span className="text-[#2DF4DD]">41 DAYS</span>
                    </div>
                  </div>
                  <p className="mt-1.5">$23,268.35.44</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Price</div>
                      <div>$0.82</div>
                    </div>
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Apy</div>
                      <div>7.23%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5">
                  <h6 className="text-xs">Trade</h6>
                  <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                    <div className="px-4 py-3 bg-[#0F60FF] rounded-xl flex items-center justify-between">
                      <span>YT</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">+9.92%</span>
                        <span className="text-xs">$0.072</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black">
                      <span>PT</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">8.75%</span>
                        <span className="text-xs">$0.748</span>
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
              <div className="p-[24.44px] rounded-[21.544px] bg-[#1D1D1D] h-[422px]">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-y-2.5">
                    <h6>sUSDC</h6>
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
                    <div className="rounded-full bg-[#383838] py-0.5 px-4 scale-75 origin-right">
                      28 Aug 2024{" "}
                      <span className="text-[#2DF4DD]">41 DAYS</span>
                    </div>
                  </div>
                  <p className="mt-1.5">$10,623,44</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Price</div>
                      <div>$1.00</div>
                    </div>
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Apy</div>
                      <div>6.88%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5">
                  <h6 className="text-xs">Trade</h6>
                  <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                    <div className="px-4 py-3 bg-[#0F60FF] rounded-xl flex items-center justify-between">
                      <span>YT</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">1.32%</span>
                        <span className="text-xs">$0.065</span>
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
              <div className="p-[24.44px] rounded-[21.544px] bg-[#1D1D1D] h-[422px] rotate-[3deg] mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-y-2.5">
                    <h6>sUSDT</h6>
                    <div className="rounded-full bg-[#292929] py-0.5 px-1 flex items-center gap-x-0.5">
                      <img src={Scallop} alt="" className="w-3.5" />
                      <span className="text-xs scale-75">Scallop</span>
                    </div>
                  </div>
                  <img src={sUSDT} alt="sUSDT" className="mr-2.5" />
                </div>
                <div className="py-3 px-3.5 rounded-xl bg-[#292929] mt-6">
                  <div className="flex items-center justify-between">
                    <h6 className="text-white/60 scale-75">TVL</h6>
                    <div className="rounded-full bg-[#383838] py-0.5 px-4 scale-75 origin-right">
                      28 Aug 2024{" "}
                      <span className="text-[#2DF4DD]">41 DAYS</span>
                    </div>
                  </div>
                  <p className="mt-1.5">$1,386,215</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Price</div>
                      <div>$1.00</div>
                    </div>
                    <div className="flex flex-col gap-y-1">
                      <div className="text-white/60">Underlying Apy</div>
                      <div>6.56%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5">
                  <h6 className="text-xs">Trade</h6>
                  <div className="grid grid-cols-2 gap-x-4 mt-2.5">
                    <div className="px-4 py-3 bg-[#0F60FF] rounded-xl flex items-center justify-between">
                      <span>YT</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">1.18%</span>
                        <span className="text-xs">$0.045</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-[#2DF5DD] rounded-xl flex items-center justify-between text-black">
                      <span>PT</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm">6.88%</span>
                        <span className="text-xs">$0.955</span>
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
            </div>
          </div>
        </div>
        <div className="w-full h-[250px] bg-gradient-to-b from-black/0 to-black absolute bottom-0"></div>
      </div>

      <div className="h-[68.125rem] pt-[126px]">
        <h1 className="text-5xl text-center max-w-[829px] mx-auto">
          Yield often fluctuates with the market, so{" "}
          <span className="text-[#65A2FF]">Nemo</span> Separates yields for
          everyone.
        </h1>
        <div className="flex items-center mt-10 justify-center gap-x-8">
          <div className="flex flex-col w-[280px]">
            <span
              className="text-center w-16 h-[50px] flex items-center justify-center"
              style={{
                backgroundImage: `url(${PT})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
              }}
            >
              PT
            </span>
            <h4 className="mt-8 text-2xl">
              Fixing yield, harvest definite returns
            </h4>
            <h6 className="mt-10 text-xs text-white/50">
              Find your stability among volatile yields. No lock-up period
            </h6>
          </div>
          <div
            style={{
              backgroundImage: `url(${Nemo})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
            }}
            className="w-[605px] h-[680px] "
          ></div>
          <div className="flex flex-col w-[280px]">
            <span
              className="text-center w-16 h-[50px] flex items-center justify-center"
              style={{
                backgroundImage: `url(${YT})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
              }}
            >
              YT
            </span>
            <h4 className="mt-8 text-2xl">
              Longing yield, generate profit from future yield
            </h4>
            <h6 className="mt-10 text-xs text-white/50">
              Long yield or hedge your yield exposure, the choice is yours.
            </h6>
          </div>
        </div>
      </div>

      <div className="h-[474px] pt-[105px] bg-[#06091c] hidden">
        <h1 className="text-5xl text-center max-w-[829px] mx-auto">
          Trusted by
        </h1>
        <div className="grid grid-cols-5 gap-x-4 max-w-[1200px] mx-auto mt-[60px]">
          <div className="bg-[#16238E] rounded-3xl flex items-center justify-center h-[120px]">
            <img src={Assmbly} alt="" />
          </div>
          <div className="bg-[#16238E] rounded-3xl flex items-center justify-center h-[120px]">
            <img src={Comma3} alt="" />
          </div>
          <div className="bg-[#16238E] rounded-3xl flex items-center justify-center h-[120px]">
            <img src={Lbank} alt="" />
          </div>
          <div className="bg-[#16238E] rounded-3xl flex items-center justify-center h-[120px]">
            <img src={Web3fund} alt="" />
          </div>
          <div className="bg-[#16238E] rounded-3xl flex items-center justify-center h-[120px]">
            <img src={Youbi} alt="" />
          </div>
        </div>
      </div>

      <div className="h-[360px] pt-[76px] bg-[#03050f] hidden">
        <h1 className="text-5xl text-center max-w-[829px] mx-auto">
          Our Partners
        </h1>
        <div className="flex items-center justify-center gap-x-8 mt-[60px]">
          <div className="bg-[#5A8AC6] bg-opacity-[0.38] rounded-2xl flex items-center justify-center w-[300px] h-[120px] gap-x-4">
            <img src={Sui} alt="Sui" />
            <span className="text-[#5A8AC6] text-2xl">SUI</span>
          </div>
          <div className="bg-[#68FFD8] bg-opacity-[0.38] rounded-3xl flex items-center justify-center w-[300px] h-[120px] gap-x-4">
            <img src={Cetus} alt="Cetus" />
            <span className="text-[#68FFD8] text-2xl">Cetus</span>
          </div>
          <div className="bg-[#FF8B4A] bg-opacity-[0.38] rounded-3xl flex items-center justify-center w-[300px] h-[120px] gap-x-4">
            <img src={Scallop} alt="Scallop" />
            <span className="text-[#FF8B4A] text-2xl">Scallop</span>
          </div>
        </div>
      </div>

      <div className="h-[460px] pt-[76px] hidden">
        <h1 className="text-5xl text-center max-w-[829px] mx-auto">Audits</h1>
        <div className="flex items-center justify-between mt-[60px] rounded-3xl bg-gradient-to-r from-[#0040FF] to-[#002699] w-[1189px] h-[238px] mx-auto pl-[67px] pt-[46px] pr-[89px]">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-y-6">
              <h4 className="text-3xl">MoveBit</h4>
              <h6 className="text-white/50 text-xl max-w-60 text-balance">
                MoveBit focuses on security audit and building the standard in
                Move.
              </h6>
            </div>
            <img src={MoveBit} alt="MoveBit" />
          </div>
        </div>
      </div>

      <div className="h-[214px] pt-[53.32px] flex items-start justify-between w-[1189px] mx-auto hidden">
        <div>
          <img src={logo} alt="nemo" />
          <p>Yield trading for everyone.</p>
        </div>
        <div className="flex gap-x-10">
          <div className="flex flex-col gap-y-4">
            <div>Home</div>
            <div className="text-white/60">home</div>
          </div>
          <div className="flex flex-col gap-y-4">
            <div>Community</div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              Twitter
            </div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              Telegram
            </div>
          </div>
          <div className="flex flex-col gap-y-4">
            <div>Docs</div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              gitbook
            </div>
          </div>
          <div className="flex flex-col gap-y-4">
            <div>Learn</div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              YT trading
            </div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              PT trading
            </div>
            <div className="text-white/60 hover:text-white cursor-pointer">
              earn
            </div>
          </div>
          <button
            className="border border-white bg-transparent rounded-3xl px-3 py-2 h-9 text-xs"
            onClick={() => {
              toast({
                title: "Coming soon!",
              });
            }}
          >
            Launch App
          </button>
        </div>
      </div>

      <div className="h-[56px] flex items-center justify-between w-[1189px] mx-auto mb-4">
        <div className="flex items-center gap-x-4">
          <img src={Twitter} alt="" />
          <img src={X} alt="" />
        </div>
        <div>2024 Nemolab Inc.</div>
      </div>
    </div>
  );
}
