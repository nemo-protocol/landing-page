import List from "./List"
import Header from "@/components/Header"
import { Eye, Plus } from "lucide-react"

export default function Portfolio() {
  return (
    <>
      <Header />

      <div className="py-10 px-6 xl:px-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h6 className="flex items-center gap-x-2">
              <span className="text-xs">Total Position</span>
              <Eye className="size-3.5 hidden" />
            </h6>
            <h4 className="text-3xl py-2.5">$14,257.89</h4>
            <h4 className="text-3xl flex items-center gap-x-2">
              <span className="text-sm text-[#FF7474]">-$1200.78 (-1.89%)</span>
              <div className="py-1 px-1.5 bg-[#1A1D1E] text-xs rounded-2xl">
                24H
              </div>
            </h4>
          </div>
          <button className="bg-[#0F60FF] px-6 py-2.5 rounded-3xl flex items-center hidden">
            <Plus />
            <span>Add transaction</span>
          </button>
        </div>
        <List />
      </div>
    </>
  )
}
