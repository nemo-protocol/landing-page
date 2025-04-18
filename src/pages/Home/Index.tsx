import { ChevronRight } from "lucide-react"
import Header from "./Header"
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
        style={{ backgroundImage: `url(/images/svg/bg-1.svg)` }}
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
                  <ChevronRight className="size-4" />
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
              className="mx-auto md:max-w-[750px] lg:max-w-[1000px] w-full md:w-fit"
              initial={{ opacity: 0, y: 50 }}
              animate={ref1InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div
          className={["lg:pt-12 flex flex-col", containerStyles].join(" ")}
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
          <div className="flex flex-col lg:flex-row items-center mt-10 justify-center gap-8">
            <motion.img
              alt=""
              ref={ref5}
              src="/images/png/nemo.png"
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
                style={{ backgroundImage: `url(/images/png/PT.png)` }}
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
              src="/images/png/nemo.png"
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
                style={{ backgroundImage: `url(/images/png/YT.png)` }}
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

          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={ref4InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center text-white text-2xl md:text-4xl my-6 md:my-10"
          >
            Audit by
          </motion.h2>

          {/* MoveBit 部分 */}
          <a
            href="https://movebit.xyz/reports/20250217-Nemo-Final-Audit-Report.pdf"
            target="_blank"
            className="rounded-[24px] bg-gradient-to-r from-[#0040FF] to-[#002699] backdrop-blur-[11.2px] p-8 lg:p-12"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={ref4InView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="w-full lg:w-1/3"
              >
                <h2 className="text-3xl md:text-4xl text-white font-medium mb-4">
                  MoveBit
                </h2>
                <p className="text-white/50 text-sm md:text-base">
                  MoveBit focuses on security audit and building the standard
                  inMove.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={ref4InView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="w-[307px]"
              >
                <img
                  src="/images/home/movebit.png"
                  alt="MoveBit"
                  className="w-full max-w-[400px] mx-auto"
                />
              </motion.div>
            </div>
          </a>

          <motion.div
            ref={ref4}
            initial={{ opacity: 0, y: 50 }}
            animate={ref4InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="py-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-x-4">
              <a target="_blank" href="https://t.me/NemoProtocol">
                <img
                  src="/images/svg/telegram.svg"
                  alt="telegram"
                  className="size-10"
                />
              </a>
              <a target="_blank" href="https://x.com/nemoprotocol">
                <img src="/images/svg/x.svg" alt="x" className="size-10" />
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
