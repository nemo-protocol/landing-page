import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"
import Item from "./Item";
import { PointItem } from "./type";
import CoinIcon from "@/assets/images/svg/rewards/coin.svg?react";


export default function CustomTable({
  list
}: {
  list?: PointItem[];
}) {
  return (
    <div
      className="rounded-3xl border border-white/5 mt-9 relative"
    >
      <Table faStyle={{
        maxHeight: 'calc(100vh - 480px)',
        overflowY: 'auto',
      }}>
        <TableHeader
          style={{
            background: "linear-gradient(246deg, #061A40 -12%, #000308 26.64%)",
            position: 'sticky',
            top: 0,
          }}
        >
          <TableRow className="text-white/80 text-xs">
            <TableHead>Rank</TableHead>
            <TableHead className="text-center">Address</TableHead>
            <TableHead className="text-center">Points Per Day</TableHead>
            <TableHead className="text-center">Total Points</TableHead>
          </TableRow>
        </TableHeader>
        {list?.length && (
          <TableBody className="overflow-y-auto custom-scrollbar">
            {list.map((item) => (
              <Item
                key={item.rank}
                {...item}
              />
            ))}
          </TableBody>
        )}
      </Table>
      <CoinIcon
        className="absolute"
        style={{
          bottom: -56,
          right: -24,
        }}
      />
    </div>
  );
}
