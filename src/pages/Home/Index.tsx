import bg1 from "@/assets/images/svg/bg-1.svg";
import PT from "@/assets/images/png/PT.png";
import YT from "@/assets/images/png/YT.png";
import Nemo from "@/assets/images/png/nemo.png";
import logo from "@/assets/images/svg/logo.svg";
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
import Header from './Header'
import MarketPNG from '@/assets/images/png/market.png'

export default function Home() {
    const { toast } = useToast();

    return (
        <div className="px-6 lg:px-0 w-full overflow-x-hidden">
            <Header />
            <div
                style={{ backgroundImage: `url(${bg1})` }}
                className="pt-12 md:pt-[7.125rem] relative"
            >
                <div className="max-w-[75rem] mx-auto flex flex-col lg:px-0">
                    <h1 className="text-3xl xs:text-5xl xs:text-center text-white">
                        Yield <span className="text-[#65A2FF]">Trading</span> For Everyone
                    </h1>
                    <h6 className="xs:text-center mt-4 text-white">
                        Revolutionizing investment strategy and maximize returns with yield
                        trading.
                    </h6>
                    <div className="flex items-center xs:justify-center gap-x-5 text-white mt-10">
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
                        <a
                            target="_blank"
                            href="https://docs.nemoprotocol.com/"
                            className="rounded-full border border-white text-white bg-transparent px-5 py-3"
                        >
                            Learn More
                        </a>
                    </div>
                    <img src={MarketPNG} alt="" className="mt-9" />
                </div>
            </div>

            <div className="lg:h-[68.125rem] pt-12 md:pt-[126px]">
                <h1 className="text-3xl xs:text-5xl text-center max-w-[829px] mx-auto text-white">
                    Yield often fluctuates with the market, so{" "}
                    <span className="text-[#65A2FF]">Nemo</span> Separates yields for
                    everyone.
                </h1>
                <div className="flex flex-col lg:flex-row items-center mt-10 justify-center gap-8">
                    <div
                        style={{
                            backgroundImage: `url(${Nemo})`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "100% 100%",
                        }}
                        className="w-full lg:hidden"
                    ></div>
                    <div className="flex flex-col w-full lg:w-[280px]">
                        <span
                            className="text-center w-16 h-[50px] flex items-center justify-center text-white"
                            style={{
                                backgroundImage: `url(${PT})`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "100% 100%",
                            }}
                        >
                            PT
                        </span>
                        <h4 className="mt-5 xs:mt-8 text-xl xs:text-2xl text-white">
                            Fixing yield, harvest definite returns
                        </h4>
                        <h6 className="mt-5 xs:mt-8 text-xs text-white/50">
                            Find your stability among volatile yields. No lock-up period
                        </h6>
                    </div>
                    <div
                        style={{
                            backgroundImage: `url(${Nemo})`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "100% 100%",
                        }}
                        className="w-[605px] h-[680px] hidden lg:inline-block"
                    ></div>
                    <div className="flex flex-col w-full lg:w-[280px]">
                        <span
                            className="text-center w-16 h-[50px] flex items-center justify-center text-white"
                            style={{
                                backgroundImage: `url(${YT})`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "100% 100%",
                            }}
                        >
                            YT
                        </span>
                        <h4 className="mt-5 xs:mt-8 text-xl xs:text-2xl text-white">
                            Longing yield, generate profit from future yield
                        </h4>
                        <h6 className="mt-5 xs:mt-8 text-xs text-white/50">
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
                    <p className="text-white">Yield trading for everyone.</p>
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
                        className="border border-white bg-transparent rounded-3xl px-3 py-2 h-9 text-xs text-white"
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
                <div className="text-white">2024 Nemolab Inc.</div>
            </div>
        </div>
    );
}
