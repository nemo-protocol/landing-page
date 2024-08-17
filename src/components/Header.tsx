import { toast } from "./ui/use-toast";
import NemoLogo from "@/assets/images/svg/logo.svg?react";
import Network from "@/assets/images/svg/network.svg?react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  return (
    <header className="lg:px-7.5 w-full mx-auto py-6 flex items-center justify-between text-xs">
      <div className="flex items-center gap-x-6">
        <div className="flex gap-x-2">
          <NemoLogo />
          <div className="text-[#44E0C3] py-1 px-2 rounded-full bg-[#ECFBF9]/10 text-xs">
            Beta
          </div>
        </div>
        <ul className="flex items-center">
          <li
            className={[
              "w-24 text-center bg-transparent py-2 rounded-full cursor-pointer",
            ].join(" ")}
          >
            <Link
              to="/markets"
              className={
                location.pathname === "/markets"
                  ? "text-white"
                  : "text-white/50"
              }
            >
              Markets
            </Link>
          </li>
          <li
            onClick={() => {
              toast({
                title: "Coming soon!",
              });
            }}
            className={[
              "w-24 text-center bg-transparent rounded-full cursor-pointer",
              location.pathname === "portfolio"
                ? "text-white"
                : "text-white/50",
            ].join(" ")}
          >
            Portfolio
          </li>
          <li
            className={[
              "w-24 text-center bg-transparent rounded-full cursor-pointer",
            ].join(" ")}
          >
            <Link
              to="/learn"
              className={
                location.pathname === "/learn" ? "text-white" : "text-white/50"
              }
            >
              Learn
            </Link>
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-x-6">
        <Network />
        <button
          className="bg-[#0052F2] text-white px-3 py-2 rounded-full"
          onClick={() => {
            toast({
              title: "Coming soon!",
            });
          }}
        >
          Connect Wallet
        </button>
      </div>
    </header>
  );
}
