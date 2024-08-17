import Header from "@/components/Header";
import SideBar from "./SideBar";
import { useState } from "react";
import GettingStarted from "./GettingStarted";
import YieldTokenisation from "./YieldTokenisation";

export default function Learn() {
  const [step, setStep] = useState(0);
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="lg:px-7.5 flex gap-x-28 grow">
        <div className="flex items-center">
          <SideBar step={step} setStep={setStep} />
        </div>
        <div className="flex items-center justify-center">
          {step === 0 && <GettingStarted />}
          {step === 1 && <YieldTokenisation />}
        </div>
      </div>
    </div>
  );
}
