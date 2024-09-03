import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-white/80 text-xs">
          <TableHead>Name</TableHead>
          <TableHead className="text-center">You pay</TableHead>
          <TableHead className="text-center">After</TableHead>
          <TableHead className="text-center">You can redeem</TableHead>
          <TableHead className="text-center">Fixed Return</TableHead>
          <TableHead className="text-center">Fixed Apy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <img
              src="https://nemoprotocol.com/static/sui.svg"
              alt="sSUI"
              className="size-10"
            />
            <span>PT sSUI</span>{" "}
          </TableCell>
          <TableCell className="text-center">$0.44</TableCell>
          <TableCell className="text-center">300 Days</TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span>$0.55</span>
              <span className="text-sm text-white/50">1.00 sSUI</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span className="text-[#44E0C3]">0.12 sSUI</span>
              <span className="text-sm text-white/50">$0.08</span>
            </div>
          </TableCell>
          <TableCell className="text-center text-[#44E0C3]">7.54%</TableCell>
        </TableRow>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <img
              src="https://nemoprotocol.com/static/usdc.svg"
              alt="sSUI"
              className="size-10"
            />
            <span>PT sUSDC</span>{" "}
          </TableCell>
          <TableCell className="text-center">$0.44</TableCell>
          <TableCell className="text-center">300 Days</TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span>$0.55</span>
              <span className="text-sm text-white/50">1.00 sSUI</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span className="text-[#44E0C3]">0.12 sSUI</span>
              <span className="text-sm text-white/50">$0.08</span>
            </div>
          </TableCell>
          <TableCell className="text-center text-[#44E0C3]">7.54%</TableCell>
        </TableRow>
        <TableRow
          className="cursor-pointer"
          onClick={() => navigate("/market/detail")}
        >
          <TableCell className="flex items-center gap-x-3">
            <img
              src="https://nemoprotocol.com/static/usdt.svg"
              alt="sSUI"
              className="size-10"
            />
            <span>PT sUSDT</span>{" "}
          </TableCell>
          <TableCell className="text-center">$0.44</TableCell>
          <TableCell className="text-center">300 Days</TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span>$0.55</span>
              <span className="text-sm text-white/50">1.00 sSUI</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col items-center">
              <span className="text-[#44E0C3]">0.12 sSUI</span>
              <span className="text-sm text-white/50">$0.08</span>
            </div>
          </TableCell>
          <TableCell className="text-center text-[#44E0C3]">7.54%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
