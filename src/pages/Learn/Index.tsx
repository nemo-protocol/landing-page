import Header from "@/components/Header";
import SideBar from "./SideBar";
import { useState } from "react";
import GettingStarted from "./GettingStarted";
import YieldTokenisation from "./YieldTokenisation";
import FixingYieldWithPT from "./FixingYieldWithPT";
import LongingYieldWithYT from "./LongingYieldWithYT";
import StrategicYieldTrading from "./StrategicYieldTrading";

export default function Learn() {
  const [step, setStep] = useState(1);
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="lg:px-7.5 flex gap-x-28 grow">
        <div className="flex items-center">
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
  );
}
