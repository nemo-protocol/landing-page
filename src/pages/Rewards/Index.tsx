import Header from "@/components/Header"
import { motion } from "framer-motion"
import NemoPoint from "./NemoPoint"
import CustomTable from "./CustomTable"
import MobileTable from "./MobileTable"
import { useRewardList, useRewardWithAddress } from "@/queries"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"

export default function Rewards() {
  const { address } = useWallet()
  const { data: list, isLoading: isListLoading } = useRewardList()
  const { data: userPoint, isLoading: isUserPointLoading } = useRewardWithAddress(address)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="py-4 sm:py-10 px-4 xl:px-0 space-y-4 xl:max-w-[1200px] xl:mx-auto">
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
            <Skeleton className={`h-[${isMobile ? '120' : '400'}px] w-full rounded-3xl`} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {isMobile ? (
              <MobileTable list={convertedList} />
            ) : (
              <CustomTable list={convertedList} />
            )}
          </motion.div>
        )}
      </div>
    </>
  )
}
