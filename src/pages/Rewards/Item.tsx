import { TableRow, TableCell } from "@/components/ui/table"
import { shortenString } from "./utils";
import { PointItem } from "./type"
import CopyIcon from "@/assets/images/svg/rewards/copy.svg?react";
import ShareIcon from "@/assets/images/svg/rewards/share.svg?react";
import { useToast } from "@/components/Toast"

export default function Item({
  rank,
  address,
  pointsPerDay,
  totalPoints,
}: PointItem) {
  const toast = useToast()

  const onCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard")
  }

  const onShare = (address: string) => {
    window.open("https://suiscan.xyz/mainnet/account/" + address, "_blank");
  };

  return (
    <TableRow >
      <TableCell className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {rank}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          {shortenString(address)}
          <CopyIcon className="cursor-pointer" onClick={onCopy} />
          <ShareIcon className="cursor-pointer" onClick={() => onShare(address)} />
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
