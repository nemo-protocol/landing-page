import AddIcon from "@/assets/images/svg/add.svg?react"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SwitchIcon from "@/assets/images/svg/switch.svg?react"
import LoadingIcon from "@/assets/images/svg/loading.svg?react"
import DownArrowIcon from "@/assets/images/svg/down-arrow.svg?react"

export default function Trade() {
  return (
    <div className="w-full bg-[#0E0F16] rounded-[40px] px-5 py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-7">
          <span className="text-white">Swap</span>
          <span className="text-white/50">Mint</span>
        </div>
        <div className="flex items-center gap-x-2 w-auto">
          <LoadingIcon />
          <div className="flex items-center gap-x-2 bg-[#242632]/30 rounded-md py-1.5 px-2.5">
            <SwitchIcon />
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
          <WalletIcon />
          <span>Balance:1998.45</span>
        </div>
      </div>
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>sSUI</span>
          <DownArrowIcon />
        </div>
        <input type="text" className="bg-transparent h-full outline-none" />
      </div>
      <div className="flex items-center gap-x-2 justify-end mt-3.5">
        <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">Half</div>
        <div className="bg-[#1E212B] p-1 rounded-[20px] text-xs">Max</div>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>sSUI</span>
          <DownArrowIcon />
        </div>
        <input type="text" className="bg-transparent h-full outline-none" />
      </div>
      <AddIcon className="mx-auto mt-5" />
      <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl mt-[18px]">
        <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
          <SSUIIcon className="size-6" />
          <span>sSUI</span>
          <DownArrowIcon />
        </div>
        <input type="text" className="bg-transparent h-full outline-none" />
      </div>
    </div>
  )
}
