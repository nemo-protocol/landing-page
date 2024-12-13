import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import YieldTokenization from "@/assets/images/svg/rewards/TopLog.svg?react";
import RankingIcon from "@/assets/images/svg/ranking.svg?react";
import DayIcon from "@/assets/images/svg/day.svg?react";
import PointIcon from "@/assets/images/svg/point.svg?react";
import { PointItem } from "@/pages/Rewards/type.ts"

export default function NemoPoint({
  userPoint
}: {
  userPoint?: PointItem[];
})  {
  return (
    <div className="flex items-center gap-4 justify-between">
      <div className="w-full self-end min-w-0">
        <motion.h6
          className="flex items-center gap-x-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-[28px] font-black">
            Nemo points
          </span>
        </motion.h6>
        <p className="text-white/70 sm:text-sm space-x-2 mt-4 mb-4">
          <Link
            to="https://docs.nemoprotocol.com/tutorial/nemo-points"
            className="underline text-white/70 underline-offset-2"
          >
            Details & Rules
          </Link>
        </p>

        <div className="w-full flex flex-col md:flex-row items-center gap-5">
          <motion.div
            className="flex items-center justify-between gap-x-4 px-5 py-6 rounded-3xl w-full h-[120px] border border-white/5 flex-1"
            style={{
              background:
                "linear-gradient(85.3deg, rgba(34, 30, 24, 0.11) 6.17%, rgba(255, 178, 23, 0.14) 114.58%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex flex-col gap-y-2">
              <span className="text-white/60 text-xs">
                My Total Points
              </span>
              <span className="text-white text-2xl">
                {userPoint?.[0]?.totalPoints || 0}
              </span>
            </div>
            <PointIcon />
          </motion.div>

          <motion.div
            className="flex items-center justify-between gap-x-4 px-5 py-6 rounded-3xl w-full md:w-[360px] h-[120px] border border-white/5 flex-1"
            style={{
              background:
                "linear-gradient(86.62deg, rgba(14, 23, 24, 0.19) 6.9%, rgba(50, 99, 246, 0.16) 114.28%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex flex-col gap-y-2">
              <span className="text-white/60 text-xs">
                Points Per Day
              </span>
              <div className="flex items-center gap-x-2">
                <span className="text-white text-2xl">
                  {userPoint?.[0]?.pointsPerDay || 0}
                </span>
              </div>
            </div>
            <DayIcon />
          </motion.div>

          <motion.div
            className="flex items-center justify-between gap-x-4 px-5 py-6 rounded-3xl w-full h-[120px] border border-white/5 flex-1"
            style={{
              background:
                "linear-gradient(83.37deg, rgba(15, 21, 20, 0.15) 5.27%, rgba(2, 209, 185, 0.23) 107%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex flex-col gap-y-2">
              <span className="text-white/60 text-xs">
                Ranking
              </span>
              <div className="flex items-center gap-x-2">
                <span className="text-white text-2xl">
                  {userPoint?.[0]?.rank || 0}
                </span>
              </div>
            </div>
            <RankingIcon />
          </motion.div>
        </div>
      </div>
      <YieldTokenization className="flex-grow-0 flex-shrink-0 hidden lg:block" />
    </div>
  );
}
