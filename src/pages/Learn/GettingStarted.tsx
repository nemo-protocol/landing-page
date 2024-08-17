import YieldTrading from "@/assets/images/svg/learn/YieldTrading.png";
import FixingYourYield from "@/assets/images/svg/learn/FixingYourYield.png";
import LongingTheYield from "@/assets/images/svg/learn/LongingTheYield.png";
import YieldTokenization from "@/assets/images/svg/learn/YieldTokenization.svg?react";

export default function GettingStarted() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl">Getting Started</h1>
      <p className="mt-7.5 text-pretty">
        In DeFi world, we often encounter yields that are high or low. These
        &nbsp;<span className="text-[#75A4FF]">yields fluctuate</span>
        &nbsp;within a certain range, thereby affecting our earnings. For
        example, if you deposited SUI into Scallop in April 2024, the APY was
        around&nbsp;<span className="text-[#75A4FF]">20%</span>
        &nbsp;at that time. While in July 2024, the&nbsp;
        <span className="text-[#75A4FF]">APY was around 7.5%</span>
        &nbsp;. How to amplify your earnings amid the fluctuates in yield? Nemo
        can help you achieve this.
      </p>
      <div className="grid grid-cols-4 pt-20 gap-5">
        <div className="border border-white py-6 px-7 rounded-2xl flex flex-col items-center">
          <div className="flex items-center gap-x-4 w-full">
            <h2 className="text-5xl">1</h2>
            <div>
              <p className="text-xs text-white/60">Basic Concept</p>
              <h6 className="text-white">Yield Tokenization</h6>
            </div>
          </div>
          <YieldTokenization className="mt-10" />
        </div>
        <div className="border border-white py-6 px-7 rounded-2xl flex flex-col items-center">
          <div className="flex items-center gap-x-4 w-full">
            <h2 className="text-5xl">2</h2>
            <div>
              <p className="text-xs text-white/60">Master PT</p>
              <h6 className="text-white">Fixing your yield</h6>
            </div>
          </div>
          <p className="pt-4.5 text-white/80 text-xs">
            You lock in a quarantined fixed yield, This is particularly useful
            if you think yield will godown.
          </p>
          <img src={FixingYourYield} alt="" className="mt-6" />
        </div>
        <div className="border border-white py-6 px-7 rounded-2xl flex flex-col items-center">
          <div className="flex items-center gap-x-4 w-full">
            <h2 className="text-5xl">3</h2>
            <div>
              <p className="text-xs text-white/60">Master YT</p>
              <h6 className="text-white">Longing the yield</h6>
            </div>
          </div>
          <p className="pt-4.5 text-white/80 text-xs">
            You speculate that the yield of a particular asset will go up. You
            long yield and profit if yield goes up.
          </p>
          <img src={LongingTheYield} alt="" className="mt-6" />
        </div>
        <div className="border border-white py-6 px-7 rounded-2xl flex flex-col items-center">
          <div className="flex items-center gap-x-4 w-full">
            <h2 className="text-5xl">4</h2>
            <div>
              <p className="text-xs text-white/60">Trading Strategy</p>
              <h6 className="text-white">Yield Trading</h6>
            </div>
          </div>
          <p className="pt-4.5 text-white/80 text-xs">
            You switch between PT and YT top refit from yield volatility and get
            a better effective APY on the underlying asset.
          </p>
          <img src={YieldTrading} alt="" className="mt-6" />
        </div>
      </div>
    </div>
  );
}
