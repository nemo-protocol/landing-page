import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import Header from "@/components/Header"
import { useCoinInfoList } from "@/queries"
import MarketItem from "./components/MarketItem"
import MarketTable from "./components/MarketTable"
import MarketSkeleton from "./components/MarketSkeleton"
import MarketTableSkeleton from "./components/MarketTableSkeleton"
import { useState, useEffect } from "react"
import { TableIcon, LayoutGridIcon } from "lucide-react"
import useMultiPoolData from "@/hooks/useMultiPoolData"

const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

export default function Home() {
  const { data: list, isLoading } = useCoinInfoList()
  const poolIds = ["0xf7ba237574389af49521b47b005be2e5ab3855bd85c4db46c578fa8176acc175"]
  const { data: poolDataList } = useMultiPoolData(poolIds)
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    const savedViewMode = localStorage.getItem("marketViewMode")
    return savedViewMode === "table" || savedViewMode === "grid"
      ? savedViewMode
      : "grid"
  })

  useEffect(() => {
    console.log("poolDataList", poolDataList)
  }, [poolDataList])

  useEffect(() => {
    console.log("list", list)
  }, [list])

  useEffect(() => {
    localStorage.setItem("marketViewMode", viewMode)
  }, [viewMode])

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && viewMode === "table") {
        setViewMode("grid")
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [viewMode])

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
        <div className="hidden md:flex items-center justify-end">
          <button
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-white/10" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGridIcon className="size-5 text-white" />
          </button>
          <button
            className={`p-2 rounded-lg ${viewMode === "table" ? "bg-white/10" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="size-5 text-white" />
          </button>
        </div>
        {isLoading ? (
          <motion.div
            className="mt-[30px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "grid" || isMobile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2].map((item) => (
                  <MarketSkeleton key={item} className="block" />
                ))}
                {[3, 4].map((item) => (
                  <MarketSkeleton key={item} className="hidden md:block" />
                ))}
                {[5, 6].map((item) => (
                  <MarketSkeleton key={item} className="hidden xl:block" />
                ))}
              </div>
            ) : (
              <MarketTableSkeleton />
            )}
          </motion.div>
        ) : (
          <motion.div
            className="mt-[30px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "grid" || isMobile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {list?.map((item) => (
                  <MarketItem
                    key={item.coinType + "_" + item.maturity}
                    item={item}
                    poolData={poolDataList?.[item.marketStateId]}
                  />
                ))}
              </div>
            ) : (
              <MarketTable list={list || []} poolDataMap={poolDataList} />
            )}
          </motion.div>
        )}
      </div>
    </>
  )
}
