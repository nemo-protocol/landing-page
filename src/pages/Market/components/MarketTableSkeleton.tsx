import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MarketTableSkeleton = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="!px-0">Pool</TableHead>
          <TableHead align="center">Maturity</TableHead>
          <TableHead align="center">TVL</TableHead>
          <TableHead className="!px-2 text-right">Fixed APY</TableHead>
          <TableHead className="!px-2 text-right">Leveraged APY</TableHead>
          <TableHead className="!px-2 text-right">Pool APY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4].map((item) => (
          <TableRow key={item}>
            <TableCell className="!px-0">
              <div className="flex items-center">
                <div className="size-8 rounded-full bg-white/5 animate-pulse" />
                <div className="h-4 w-12 bg-white/5 rounded ml-3 animate-pulse" />
                <div className="h-6 w-16 bg-white/5 rounded-[60px] ml-4 animate-pulse" />
              </div>
            </TableCell>
            <TableCell align="center">
              <div className="h-6 w-28 bg-white/5 rounded mx-auto animate-pulse" />
            </TableCell>
            <TableCell className="!px-0" align="center">
              <div className="h-6 w-24 bg-white/5 rounded mx-auto animate-pulse" />
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-white/5 rounded-xl w-[192px] h-[52px] ml-auto animate-pulse" />
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-white/5 rounded-xl w-[200px] h-[52px] ml-auto animate-pulse" />
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-white/5 rounded-xl w-[200px] h-[52px] ml-auto animate-pulse" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default MarketTableSkeleton 