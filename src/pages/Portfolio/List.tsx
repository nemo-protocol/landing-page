import Item from "./Item"
import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"

export default function List() {
  const itemProps = {
    name: "sSUI",
    ptPrice: "0.12",
    lpPrice: "0.18",
    ytPrice: "0.02",
    maturity: "1730390400000",
    icon: "https://nemoprotocol.com/static/sui.svg",
    coinType:
      "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI",
  }
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
        <Item {...itemProps} />
      </TableBody>
    </Table>
  )
}
