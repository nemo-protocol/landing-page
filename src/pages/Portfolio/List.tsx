import { useNavigate } from "react-router-dom"
import SSUI from "@/assets/images/svg/sSUI.svg?react"
import SUSDC from "@/assets/images/svg/sUSDC.svg?react"
import {
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"

export default function List() {
  const navigate = useNavigate()
  const data = [
    {
      id: 1,
      icon: <SSUI className="size-10" />,
      name: "PT sSUI",
      date: "Apr 15 2015",
      type: "PT",
      price1: "$10,245.89",
      price2: "$12,822.77",
      price3: "$523.08",
    },
    {
      id: 2,
      icon: <SSUI className="size-10" />,
      name: "YT sSUI",
      date: "Apr 15 2015",
      type: "YT",
      price1: "$10,245.89",
      price2: "$12,822.77",
      price3: "$523.08",
    },
    {
      id: 3,
      icon: <SUSDC className="size-10" />,
      name: "LP sUSDC",
      date: "Apr 15 2015",
      type: "LP",
      price1: "$10,245.89",
      price2: "$12,822.77",
      price3: "$523.08",
    },
    {
      id: 4,
      icon: <SSUI className="size-10" />,
      name: "PT sSUI",
      date: "Apr 15 2015",
      type: "PT",
      price1: "$10,245.89",
      price2: "$12,822.77",
      price3: "$523.08",
    },
  ]
  return (
    <Table>
      <TableHeader className="bg-[#1A1D1E]">
        <TableRow className="text-white/80 text-xs">
          <TableHead>Assets</TableHead>
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-center">Value</TableHead>
          <TableHead className="text-center">Amount</TableHead>
          <TableHead className="text-center">P&L</TableHead>
          <TableHead className="text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => navigate("/market/detail")}
          >
            <TableCell className="flex items-center gap-x-3">
              {item.icon}
              <div className="flex items-center gap-x-1">
                <span>{item.name}</span>
                <span className="text-white/50 text-xs">{item.date}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">{item.type}</TableCell>
            <TableCell className="text-center">{item.price1}</TableCell>
            <TableCell className="text-center">{item.price2}</TableCell>
            <TableCell className="text-center">{item.price3}</TableCell>
            <TableCell align="center" className="space-x-2 text-white">
              {item.type === "LP" ? (
                <>
                  <button className="rounded-3xl bg-[#0F60FF] w-24">Add</button>
                  <button className="rounded-3xl bg-[#FF7474] w-24">
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button className="rounded-3xl bg-[#00B795] w-24">Buy</button>
                  <button className="rounded-3xl bg-[#FF7474] w-24">
                    Sell
                  </button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
