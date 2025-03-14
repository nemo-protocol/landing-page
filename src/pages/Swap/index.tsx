import { CetusSwap } from "@cetusprotocol/terminal"
import "@cetusprotocol/terminal/dist/style.css"
import { FC } from "react"
import Header from "@/components/Header"
import { WalletProvider } from "@mysten/dapp-kit"

const SwapPage: FC = () => {
  return (
    <div className="space-y-10">
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 md:px-8 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="w-full flex items-center justify-center">
        <WalletProvider autoConnect>
          <CetusSwap
            initProps={{
              independentWallet: true,
              displayMode: "Integrated",
            }}
          />
        </WalletProvider>
      </div>
    </div>
  )
}

export default SwapPage
