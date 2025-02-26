import { Trophy } from "lucide-react"
import { motion } from "framer-motion"
import { PointItem } from "./type"
import { useToast } from "@/components/Toast"
import { shortenString } from "./utils"

function MobileCard({ rank, address, pointsPerDay, totalPoints }: PointItem) {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-white/5 bg-[#0A0B0F]/50 backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center gap-2">
          <motion.img 
            src="/images/svg/rewards/copy.svg" 
            className="w-4 h-4 cursor-pointer" 
            onClick={onCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
          <motion.img 
            src="/images/svg/rewards/share.svg" 
            className="w-4 h-4 cursor-pointer" 
            onClick={() => onShare(address)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-white/60 mb-1">Address</div>
          <div className="text-sm text-white/80">{shortenString(address)}</div>
        </div>
        <div className="flex justify-between">
          <div>
            <div className="text-xs text-white/60 mb-1">Points Per Day</div>
            <div className="text-sm text-white/80">{pointsPerDay.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Total Points</div>
            <div className="text-sm text-white/80">{totalPoints.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MobileTable({ list }: { list?: PointItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {list?.length ? (
        list.map((item) => <MobileCard key={item.rank} {...item} />)
      ) : (
        <div className="text-center py-8 text-white/50">
          No data available
        </div>
      )}
    </motion.div>
  )
} 