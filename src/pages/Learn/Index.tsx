import Header from "@/components/Header"
import SideBar from "./SideBar"
import { useState } from "react"
import GettingStarted from "./GettingStarted"
import YieldTokenisation from "./YieldTokenisation"
import FixingYieldWithPT from "./FixingYieldWithPT"
import LongingYieldWithYT from "./LongingYieldWithYT"
import StrategicYieldTrading from "./StrategicYieldTrading"

export default function Learn() {
  const [step, setStep] = useState(0)
  return (
    <div className="min-h-screen xl:max-w-[1200px] xl:mx-auto w-full">
      <Header />
      <div className="lg:px-7.5 flex gap-x-28 grow">
        <div className="flex items-center h-96 shrink-0">
          <SideBar step={step} setStep={setStep} />
        </div>
        <div className="flex items-center justify-center grow">
          {step === 0 && <GettingStarted />}
          {step === 1 && <YieldTokenisation />}
          {step === 2 && <FixingYieldWithPT />}
          {step === 3 && <LongingYieldWithYT />}
          {step === 4 && <StrategicYieldTrading />}
        </div>
      </div>
    </div>
  )
}
