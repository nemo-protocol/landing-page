import List from "./List"
import Header from "@/components/Header"
import { ChevronRight } from "lucide-react"

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
            target="_blank"
            href="https://docs.nemoprotocol.com/tutorial/pt"
            className="underline text-sm flex items-center gap-x-1 mt-3.5 text-white hover:text-[#0052F2"
          >
            Learn more
            <ChevronRight className="size-4" />
          </a>
        </div>
        <img src="/images/svg/logo.svg" alt="logo" className="w-30 h-auto" />
      </div>
      <List />
    </>
  )
}
