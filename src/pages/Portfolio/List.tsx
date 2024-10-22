import { usePortfolioList } from "@/queries"
import Item from "./Item"
import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"

export default function List() {
  const { data: list } = usePortfolioList()
  return (
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
          <Item {...item} />
        ))}
      </TableBody>
    </Table>
  )
}
