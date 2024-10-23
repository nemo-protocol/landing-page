import { usePortfolioList } from "@/queries"
import Item from "./Item"
import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"
import { useState } from "react"

export default function List() {
  const [selectType, setSelectType] = useState<"pt" | "yt" | "lp" | "all">(
    "all",
  )
  const { data: list } = usePortfolioList()
  return (
    <>
      <div className="flex items-center gap-x-4">
        <span
          className={
            selectType === "all"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "all") {
              setSelectType("all")
            }
          }}
        >
          All
        </span>
        <span
          className={
            selectType === "pt"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "pt") {
              setSelectType("pt")
            }
          }}
        >
          PT
        </span>
        <span
          className={
            selectType === "yt"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "yt") {
              setSelectType("yt")
            }
          }}
        >
          YT
        </span>
        <span
          className={
            selectType === "lp"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "lp") {
              setSelectType("lp")
            }
          }}
        >
          LP
        </span>
      </div>
      <Table>
        <TableHeader className="bg-[#1A1D1E]">
          <TableRow className="text-white/80 text-xs">
            <TableHead>Assets</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-center">Value</TableHead>
            <TableHead className="text-center">Amount</TableHead>
            <TableHead className="text-center">Rewards</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(list ?? []).map((item) => (
            <Item {...item} selectType={selectType} />
          ))}
        </TableBody>
      </Table>
    </>
  )
}
