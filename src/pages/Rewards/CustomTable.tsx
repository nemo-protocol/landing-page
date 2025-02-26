import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
  TableCell,
} from "@/components/ui/table"
import Item from "./Item"
import { PointItem } from "./type"
import { motion } from "framer-motion"

export default function CustomTable({ list }: { list?: PointItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-white/5 mt-9 bg-[#0A0B0F]/50 backdrop-blur-md relative mb-10"
    >
      <Table>
        <TableHeader
          style={{
            background: "linear-gradient(246deg, #061A40 -12%, #000308 26.64%)",
          }}
        >
          <TableRow className="text-white/80 text-xs border-b border-white/5">
            <TableHead className="w-24">Rank</TableHead>
            <TableHead className="text-center">Address</TableHead>
            <TableHead className="text-center w-48">Points Per Day</TableHead>
            <TableHead className="text-center w-48">Total Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="overflow-y-auto custom-scrollbar">
          {list?.length ? (
            list.map((item) => <Item key={item.rank} {...item} />)
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-white/50">
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <img
        src="/images/svg/rewards/coin.svg"
        className="absolute hidden md:block -bottom-12 -right-12"
      />
    </motion.div>
  )
}
