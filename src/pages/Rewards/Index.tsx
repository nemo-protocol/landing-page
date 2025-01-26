import Header from "@/components/Header"
import { motion } from "framer-motion"
import NemoPoint from "./NemoPoint"
import CustomTable from "./CustomTable"
import { useRewardList, useRewardWithAddress } from "@/queries"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Skeleton } from "@/components/ui/skeleton"

export default function Rewards() {
  const { address } = useWallet()
  const { data: list, isLoading: isListLoading } = useRewardList()
  const { data: userPoint, isLoading: isUserPointLoading } = useRewardWithAddress(address)

  const convertedList = list?.map(item => ({
    ...item,
    rank: Number(item.rank),
    pointsPerDay: Number(item.pointsPerDay),
    totalPoints: Number(item.totalPoints)
  }))

  const convertedUserPoint = userPoint?.map(item => ({
    ...item,
    rank: Number(item.rank),
    pointsPerDay: Number(item.pointsPerDay),
    totalPoints: Number(item.totalPoints)
  }))

  return (
    <div className="min-h-screen w-full">
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="w-full max-w-[1200px] mx-auto px-4 xl:px-0">
        <div className="py-4 sm:py-10">
          {isUserPointLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[120px] w-full rounded-3xl" />
              <Skeleton className="h-[120px] w-full rounded-3xl" />
              <Skeleton className="h-[120px] w-full rounded-3xl" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <NemoPoint userPoint={convertedUserPoint} />
            </motion.div>
          )}

          {isListLoading ? (
            <div className="mt-9 space-y-4">
              <Skeleton className="h-[400px] w-full rounded-3xl" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <CustomTable list={convertedList} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
