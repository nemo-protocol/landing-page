import { TableRow, TableCell } from "@/components/ui/table"
import { shortenString } from "./utils"
import { PointItem } from "./type"
import { useToast } from "@/components/Toast"
import { motion } from "framer-motion"
import { Trophy } from "lucide-react"

export default function Item({
  rank,
  address,
  pointsPerDay,
  totalPoints,
}: PointItem) {
  const toast = useToast()

  const onCopy = () => {
    navigator.clipboard.writeText(address)
    toast.success("Address copied to clipboard")
  }

  const onShare = (address: string) => {
    window.open("https://suiscan.xyz/mainnet/account/" + address, "_blank")
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#FFD700" // Gold
      case 2:
        return "#C0C0C0" // Silver
      case 3:
        return "#CD7F32" // Bronze
      default:
        return ""
    }
  }

  return (
    <TableRow className="hover:bg-white/5 transition-colors duration-200">
      <TableCell className="w-24">
        <div className="flex items-center gap-2">
          <div className="w-4 text-right">
            <span className={`text-lg font-medium ${rank <= 3 ? "text-[#FFB217]" : "text-white/80"}`}>
              {rank}
            </span>
          </div>
          {rank <= 3 && (
            <Trophy 
              className="h-4 w-4"
              color={getRankColor(rank)}
              fill={getRankColor(rank)}
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-2">
          <span className="text-white/80">{shortenString(address)}</span>
          <motion.img 
            src="/images/svg/rewards/copy.svg" 
            className="cursor-pointer" 
            onClick={onCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
          <motion.img 
            src="/images/svg/rewards/share.svg" 
            className="cursor-pointer" 
            onClick={() => onShare(address)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        </div>
      </TableCell>
      <TableCell className="text-center w-48">
        <span className="text-white/80">{pointsPerDay.toFixed(1)}</span>
      </TableCell>
      <TableCell className="text-center w-48">
        <span className="text-white/80">{totalPoints.toFixed(2)}</span>
      </TableCell>
    </TableRow>
  )
}
