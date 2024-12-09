import { TableRow, TableCell } from "@/components/ui/table"
import { shortenString } from "./utils";
import { PointItem } from "./type"
import CopyIcon from "@/assets/images/svg/rewards/copy.svg?react";
import ShareIcon from "@/assets/images/svg/rewards/share.svg?react";

export default function Item({
  rank,
  address,
  pointsPerDay,
  totalPoints,
}: PointItem) {

  const onCopy = () => {
    navigator.clipboard.writeText(address);
  }

  const onShare = () => {
    // TODO: Share address
  }

  return (
    <TableRow className="cursor-pointer">
      <TableCell className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {rank}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          {shortenString(address)}
          <CopyIcon onClick={onCopy} />
          <ShareIcon onClick={onShare} />
        </div>
      </TableCell>
      <TableCell className="text-center">
        {pointsPerDay.toFixed(1)}
      </TableCell>
      <TableCell className="text-center">
        {totalPoints.toFixed(2)}
      </TableCell>
    </TableRow>
  )
}
