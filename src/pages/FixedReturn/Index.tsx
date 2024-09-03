import List from "./List"
import Header from "@/components/Header"
import { ChevronRight } from "lucide-react"
import Logo from "@/assets/images/svg/market/logo.svg?react"

export default function FixedReturn() {
  return (
    <>
      <Header />
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl">Fixed Return</h1>
          <p className="text-sm mt-8">
            Simply buy and hold PT, your profit is guaranteed.
          </p>

          <a
            href="https://docs.nemoprotocol.com/tutorial/pt"
            className="underline text-sm flex items-center gap-x-1 mt-3.5 text-white hover:text-[#0052F2"
          >
            Learn more
            <ChevronRight className="size-4" />
          </a>
        </div>
        <Logo />
      </div>
      <List />
    </>
  )
}
