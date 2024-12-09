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

const point: PointItem = {
  rank: 1,
  address: "0x1302342312121322244423",
  pointsPerDay: 3572.6,
  totalPoints: 1232321.32
};
const testData: PointItem[] = Array.from({ length: 10 }, (_, i) => ({
  ...point,
  rank: i + 1,
}));

export default function CustomTable({
  list = testData
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
