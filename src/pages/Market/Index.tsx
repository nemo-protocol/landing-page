import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import Header from "@/components/Header"
import { useCoinInfoList } from "@/queries"
import MarketItem from "./components/MarketItem"
import MarketSkeleton from "./components/MarketSkeleton"

const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

export default function Home() {
  const { data: list, isLoading } = useCoinInfoList()

  return (
    <>
      <div className="bg-[#08080C]">
        <div className="xl:max-w-[1200px] xl:mx-auto px-4 md:px-8 xl:px-0 bg-[#08080C]">
          <Header />
        </div>
      </div>
      <div className="py-4 sm:py-10 relative xl:max-w-[1200px] xl:mx-auto px-4 md:px-8 xl:px-0">
        <div className="flex flex-col-reverse gap-x-8 lg:flex-row lg:items-center gap-y-8 lg:gap-y-0 lg:justify-between">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={textVariants}
            transition={{ duration: 0.5 }}
            className="max-w-[584px]"
          >
            <h3 className="text-[28px] text-white font-black sm:text-[24px] text-lg">
              Market
            </h3>
            <h6 className="text-white/70 md:mt-8 mt-4">
              Dive into the yield trading market and maximize your profit
              potential.
            </h6>
            <p className="text-white/70 sm:text-sm space-x-2">
              <span>Learn More</span>
              <Link
                to="/learn"
                className="underline text-white/70 underline-offset-2"
              >
                About PT & YT Trading
              </Link>
            </p>
          </motion.div>
        </div>
        {isLoading ? (
          <motion.div
            className="mt-[30px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {[1, 2].map((item) => (
              <MarketSkeleton key={item} className="block" />
            ))}

            {[3, 4].map((item) => (
              <MarketSkeleton key={item} className="hidden md:block" />
            ))}

            {[5, 6].map((item) => (
              <MarketSkeleton key={item} className="hidden xl:block" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="mt-[30px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-all duration-200 ease-in-out"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {list?.map((item) => (
              <MarketItem
                key={item.coinType + "_" + item.maturity}
                item={item}
              />
            ))}
          </motion.div>
        )}
      </div>
    </>
  )
}
