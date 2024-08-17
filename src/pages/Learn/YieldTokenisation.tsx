import Sui from "@/assets/images/svg/sui.svg?react";
import RightDashedArrow from "@/assets/images/svg/right-dashed-arrow.svg?react";

export default function YieldTokenisation() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl">Yield Tokenisation</h1>
      <div className="border border-white rounded-2xl py-10 px-11">
        <p className="text-lg text-white/80">
          Traditionally, Alice deposits 100 Sul into Scallop, and after 3
          months, she wil get a principal and a yield of 2 SUl& 1.5 SCA
        </p>
        <div className="border border-dashed border-white rounded-2xl flex items-center py-16 justify-around">
          <div className="flex items-center gap-x-1 py-2 px-1.5 rounded-lg bg-[#242533]">
            <Sui />
            <span className="text-white/80 text-sm">
              100 SUl staked in Scallop
            </span>
          </div>
          <RightDashedArrow />
          <div className="flex flex-col items-center gap-y-5 relative">
            <span>After 3 months</span>
            <span className="text-xs text-green-primary absolute top-10">
              Redeem
            </span>
          </div>
          <RightDashedArrow />
          <div className="flex items-center gap-x-1 py-2 px-1.5 rounded-lg bg-[#242533]">
            <Sui />
            <span className="text-white/80 text-sm">100 SUl</span>
          </div>
          <RightDashedArrow />
          <div className="flex flex-col items-center gap-y-5 relative">
            <span>After 3 months</span>
            <span className="text-xs text-[#44A8E0] absolute top-10">
              Principal
            </span>
          </div>
          <span className="text-white">&</span>
          <div className="flex items-center gap-x-1 py-2 px-1.5 rounded-lg bg-[#242533]">
            <Sui />
            <span className="text-white/80 text-sm">100 SUl</span>
          </div>
        </div>
      </div>
    </div>
  );
}
