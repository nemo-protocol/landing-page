import Header from "@/components/Header"
import SideBar from "./SideBar"
import { useState } from "react"
import GettingStarted from "./GettingStarted"
import YieldTokenization from "./YieldTokenization"
import FixingYieldWithPT from "./FixingYieldWithPT"
import LongingYieldWithYT from "./LongingYieldWithYT"
import StrategicYieldTrading from "./StrategicYieldTrading"
import { motion, AnimatePresence } from "framer-motion"

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function Learn() {
  const [step, setStep] = useState(0)
  return (
    <div className="h-screen xl:max-w-[1200px] xl:mx-auto w-full flex flex-col overflow-hidden">
      <Header />
      <div className="lg:px-7.5 pt-4 lg:pt-8 grow flex flex-col overflow-hidden">
        <div className="grow overflow-y-auto custom-scrollbar pr-4 -mr-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="getting-started"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                <GettingStarted />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="yield-tokenization"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                <YieldTokenization />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="fixing-yield-with-pt"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                <FixingYieldWithPT />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="longing-yield-with-yt"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                <LongingYieldWithYT />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="strategic-yield-trading"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                <StrategicYieldTrading />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center shrink-0 py-8">
          <SideBar step={step} setStep={setStep} />
        </div>
      </div>
    </div>
  )
}
