import Header from "./Header"
import bg1 from "@/assets/images/svg/bg-1.svg"
import PT from "@/assets/images/png/PT.png"
import YT from "@/assets/images/png/YT.png"
import Nemo from "@/assets/images/png/nemo.png"
import RightArrow from "@/assets/images/svg/right-arrow.svg?react"
import Telegram from "@/assets/images/svg/telegram.svg?react"
import X from "@/assets/images/svg/x.svg?react"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Link } from "react-router-dom"
import { ReactTyped } from "react-typed"

export const containerStyles = "w-full lg:max-w-[75rem] lg:mx-auto"

export default function Home() {
  const { ref: ref1, inView: ref1InView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })
  const { ref: ref2, inView: ref2InView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })
  const { ref: ref3, inView: ref3InView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })
  const { ref: ref4, inView: ref4InView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })
  const { ref: ref5, inView: ref5InView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <div className="px-4 md:px-8">
      <div
        style={{ backgroundImage: `url(${bg1})` }}
        className="w-full h-screen bg-no-repeat bg-top bg-cover absolute top-0 left-0"
      ></div>
      <div className="overflow-hidden">
        <div className="min-h-screen flex flex-col">
          <Header />
          <div
            ref={ref1}
            className="flex flex-col items-center justify-center relative grow gap-y-12 md:gap-y-9"
          >
            <div className={["flex flex-col", containerStyles].join(" ")}>
              <motion.h1
                initial={{ opacity: 0, x: -50 }}
                animate={ref1InView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-5xl xl:text-6xl xs:text-center text-white text-balance"
              >
                Yield <span className="text-[#65A2FF]">Trading</span> For
                Everyone
              </motion.h1>
              <motion.h6
                initial={{ opacity: 0, x: -30 }}
                animate={ref1InView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="xs:text-center mt-4 text-white text-balance"
              >
                <ReactTyped
                  strings={[
                    "Revolutionize investment strategy and maximize returns with yield trading.",
                  ]}
                  typeSpeed={25}
                />
              </motion.h6>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={ref1InView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="flex items-center xs:justify-center gap-x-5 text-white mt-10"
              >
                <Link
                  to="/market"
                  className="bg-[#1954FF] flex items-center gap-x-4 rounded-full px-3 py-1.5 md:px-5 md:py-3 text-sm md:text-base"
                >
                  <span className="text-xs md:text-base text-white">
                    Enter Now
                  </span>
                  <RightArrow />
                </Link>
                <a
                  target="_blank"
                  href="https://docs.nemoprotocol.com/"
                  className="rounded-full border border-white text-white bg-transparent px-3 py-1.5 md:px-5 md:py-3 active:border-[#1954FF] active:text-[#1954FF] hover:text-[#1954FF] text-xs md:text-base"
                >
                  <span className="text-sm xs:text-base text-white">
                    Learn More
                  </span>
                </a>
              </motion.div>
            </div>
            <motion.img
              alt=""
              src="/images/home/market.png"
              className="mx-auto md:max-w-[750px] lg:max-w-[950px] w-full md:w-fit"
              initial={{ opacity: 0, y: 50 }}
              animate={ref1InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div
          className={[
            "min-h-screen lg:pt-12 flex flex-col",
            containerStyles,
          ].join(" ")}
          ref={ref2}
        >
          <motion.h1
            initial={{ opacity: 0, y: -100 }}
            animate={ref2InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl lg:text-5xl text-center text-white text-pretty"
          >
            Fixed return, points multiplier, leveraged spread,everything you
            need to maximize yield, only on{" "}
            <span className="text-[#65A2FF]">Nemo</span>.
          </motion.h1>
          <div className="grow">
            <div className="flex flex-col lg:flex-row items-center mt-10 justify-center gap-8">
              <motion.img
                alt=""
                ref={ref5}
                src={Nemo}
                className="w-full lg:hidden max-w-[300px] mx-auto"
                initial={{ opacity: 0, y: 50 }}
                animate={ref5InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                transition={{ duration: 0.5 }}
                initial={{ opacity: 0, x: -50 }}
                animate={ref3InView ? { opacity: 1, x: 0 } : {}}
                className="flex flex-col w-full lg:w-[280px]"
              >
                <span
                  style={{ backgroundImage: `url(${PT})` }}
                  className="text-center w-12 h-[38px] lg:w-16 lg:h-[50px] flex items-center justify-center text-white bg-cover bg-no-repeat bg-center"
                >
                  PT
                </span>
                <h4 className="mt-5 xs:mt-8 text-xl xs:text-2xl text-white">
                  Fixing yield, harvest definite returns
                </h4>
                <h6 className="mt-5 xs:mt-8 text-xs text-white/50">
                  Find your stability among volatile yields. No lock-up period
                </h6>
              </motion.div>
              <motion.img
                alt=""
                src={Nemo}
                className="hidden lg:inline-block mx-auto max-w-[400px]"
                initial={{ opacity: 0, y: 50 }}
                animate={ref3InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                ref={ref3}
                transition={{ duration: 0.5 }}
                initial={{ opacity: 0, x: 50 }}
                animate={ref3InView ? { opacity: 1, x: 0 } : {}}
                className="flex flex-col w-full lg:w-[280px]"
              >
                <span
                  style={{ backgroundImage: `url(${YT})` }}
                  className="text-center w-12 h-[38px] lg:w-16 lg:h-[50px] flex items-center justify-center text-white bg-cover bg-no-repeat bg-center"
                >
                  YT
                </span>
                <h4 className="mt-5 xs:mt-8 text-xl xs:text-2xl text-white">
                  Longing yield, generate profit from future yield
                </h4>
                <h6 className="mt-5 xs:mt-8 text-xs text-white/50">
                  Long yield or hedge your yield exposure, the choice is yours.
                </h6>
              </motion.div>
            </div>
          </div>
          <motion.div
            ref={ref4}
            initial={{ opacity: 0, y: 50 }}
            animate={ref4InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="py-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-x-4">
              <a target="_blank" href="https://t.me/NemoProtocol">
                <Telegram className="size-10" />
              </a>
              <a target="_blank" href="https://x.com/nemoprotocol">
                <X className="size-10" />
              </a>
            </div>
            <span className="text-sm xs:text-base text-white">
              2024 NemoLab Inc.
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
