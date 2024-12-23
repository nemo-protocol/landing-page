import Header from "@/components/Header"
import { motion, AnimatePresence } from "framer-motion"
import NemoPoint from "./NemoPoint"
import CustomTable from "./CustomTable"
import { useRewardList, useRewardWithAddress } from "@/queries"
import { useWallet } from "@nemoprotocol/wallet-kit"

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function Rewards() {
  const { address, } = useWallet()
  const { data: list } = useRewardList()
  const { data: userPoint } = useRewardWithAddress(address)

  return (
    <div
      className="h-screen xl:max-w-[1200px] xl:mx-auto w-full flex flex-col overflow-hidden"
    >
      <Header />
      <div
        className="py-10 px-6 xl:px-0 space-y-4 xl:max-w-[1200px] xl:mx-auto h-[calc(100vh-4rem)]"
      >
        <div className="grow">
          <AnimatePresence mode="wait">
            <motion.div
              key="yield-tokenization"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={variants}
              transition={{ duration: 0.3 }}
            >
              <NemoPoint userPoint={userPoint} />
            </motion.div>
            <motion.div
              key="yield-tokenization"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={variants}
              transition={{ duration: 0.3 }}
            >
              <CustomTable list={list} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
