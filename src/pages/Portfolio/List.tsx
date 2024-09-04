import { useNavigate } from "react-router-dom"
import SSUI from "@/assets/images/svg/sSUI.svg?react"
import SUSDC from "@/assets/images/svg/sUSDC.svg?react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function List() {
  const navigate = useNavigate()
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
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <SSUI className="size-10"/>
            <div className="flex items-center gap-x-1">
              <span>PT sSUI</span>
              <span className="text-white/50 text-xs">Apr 15 2015</span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center">$10,245.89</TableCell>
          <TableCell className="text-center">$12,822.77</TableCell>
          <TableCell className="text-center">$523.08</TableCell>
          <TableCell className="text-center text-[#44E0C3]"></TableCell>
        </TableRow>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <SSUI className="size-10"/>
            <div className="flex items-center gap-x-1">
              <span>YT sSUI</span>
              <span className="text-white/50 text-xs">Apr 15 2015</span>
            </div>
          </TableCell>
          <TableCell className="text-center">YT</TableCell>
          <TableCell className="text-center">$10,245.89</TableCell>
          <TableCell className="text-center">$12,822.77</TableCell>
          <TableCell className="text-center">$523.08</TableCell>
          <TableCell className="text-center text-[#44E0C3]"></TableCell>
        </TableRow>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <SUSDC className="size-10"/>
            <div className="flex items-center gap-x-1">
              <span>LP sUSDC</span>
              <span className="text-white/50 text-xs">Apr 15 2015</span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center">$10,245.89</TableCell>
          <TableCell className="text-center">$12,822.77</TableCell>
          <TableCell className="text-center">$523.08</TableCell>
          <TableCell className="text-center text-[#44E0C3]"></TableCell>
        </TableRow>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <SSUI className="size-10"/>
            <div className="flex items-center gap-x-1">
              <span>PT sSUI</span>
              <span className="text-white/50 text-xs">Apr 15 2015</span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center">$10,245.89</TableCell>
          <TableCell className="text-center">$12,822.77</TableCell>
          <TableCell className="text-center">$523.08</TableCell>
          <TableCell className="text-center text-[#44E0C3]"></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
