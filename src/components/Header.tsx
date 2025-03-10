import { cn } from "@/lib/utils"
import { useState } from "react"
import copy from "clipboard-copy"
import { IS_DEV } from "@/config"
import { motion } from "framer-motion"
import { truncateStr } from "@/lib/utils"
import { useToast } from "@/components/Toast"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, LayoutGrid } from "lucide-react"
import { ConnectModal, useWallet } from "@nemoprotocol/wallet-kit"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

export default function Header({ className }: { className?: string }) {
  const toast = useToast()
  const location = useLocation()
  // const { accounts } = useWallet()
  const { account: currentAccount, disconnect } = useWallet()
  const [open, setOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await copy(text)
      toast.success("Address copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy address")
    }
  }

  return (
    <header className={cn("h-16 shrink-0", className)}>
      <div className=" w-full h-full mx-auto flex items-center justify-between text-xs">
        <Link to="/" className="flex gap-x-2">
          <img src="/images/svg/logo.svg" alt="logo" className="w-30 h-auto" />
        </Link>

        <ul className="md:flex items-center text-sm hidden h-full">
          <li
            className={[
              "w-24 h-full text-center cursor-pointer flex items-center justify-center hidden",
              location.pathname === "/fixed-return"
                ? "!bg-[#12121B] border-b border-b-white"
                : "bg-transparent",
            ].join(" ")}
          >
            <Link
              to="/fixed-return"
              className={[
                location.pathname === "/fixed-return"
                  ? "text-white"
                  : "text-white/50",
                "flex items-center gap-x-1",
              ].join(" ")}
            >
              <span>Fixed Return</span>
              <img src="/images/svg/hot.svg" alt="hot" className="size-3" />
            </Link>
          </li>
          <li className={["w-24 h-full text-center"].join(" ")}>
            <Link
              to="/market"
              className={[
                location.pathname === "/market"
                  ? "text-white bg-[#12121B] border-b border-b-white"
                  : "text-white/50 bg-transparent hover:bg-[#12121B] hover:text-white",
                "flex items-center justify-center h-full cursor-pointer",
              ].join(" ")}
            >
              Market
            </Link>
          </li>
          <li className={["w-24 h-full text-center"].join(" ")}>
            <Link
              to="/portfolio"
              className={[
                location.pathname === "/portfolio"
                  ? "text-white bg-[#12121B] border-b border-b-white"
                  : "text-white/50 bg-transparent hover:bg-[#12121B] hover:text-white",
                "flex items-center justify-center h-full cursor-pointer",
              ].join(" ")}
            >
              Portfolio
            </Link>
          </li>
          <li className={["w-24 h-full text-center"].join(" ")}>
            <Link
              to="/swap"
              className={[
                location.pathname === "/swap"
                  ? "text-white bg-[#12121B] border-b border-b-white"
                  : "text-white/50 bg-transparent hover:bg-[#12121B] hover:text-white",
                "flex items-center justify-center h-full cursor-pointer",
              ].join(" ")}
            >
              Swap
            </Link>
          </li>
          <li className={["w-24 h-full text-center"].join(" ")}>
            <Link
              to="/learn"
              className={[
                location.pathname === "/learn"
                  ? "text-white bg-[#12121B] border-b border-b-white"
                  : "text-white/50 bg-transparent hover:bg-[#12121B] hover:text-white",
                "flex items-center justify-center h-full cursor-pointer",
              ].join(" ")}
            >
              Learn
            </Link>
          </li>
          <li className={["w-24 h-full text-center"].join(" ")}>
            <Link
              to="/points"
              className={[
                location.pathname === "/points"
                  ? "text-white bg-[#12121B] border-b border-b-white"
                  : "text-white/50 bg-transparent hover:bg-[#12121B] hover:text-white",
                "flex items-center justify-center h-full cursor-pointer",
              ].join(" ")}
            >
              Points
            </Link>
          </li>
        </ul>
        <div className="flex items-center gap-x-2 sm:gap-x-6 h-full">
          <span
            className={[
              "relative h-full text-center cursor-pointer items-center justify-center",
              "bg-transparent md:flex hidden",
            ].join(" ")}
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-x-1 border-none outline-none">
                <span className="text-white">More</span>
                <ChevronDown className="size-3 mt-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E0F16] border-none">
                <DropdownMenuItem>
                  <Link
                    to="/mint"
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-[100px] h-8"
                  >
                    Mint
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-[100px] h-8"
                    href="https://www.sentio.xyz/"
                    target="_blank"
                  >
                    Sentio
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
          {location.pathname === "/swap" ? null : currentAccount?.address ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-x-1 border-none outline-none">
                <span className="text-white">
                  {truncateStr(currentAccount?.address || "", 4)}
                </span>
                <ChevronDown className="size-3 mt-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E0F16] border-none min-w-[140px]">
                <DropdownMenuItem>
                  <button
                    onClick={() => disconnect()}
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-full h-8"
                  >
                    Disconnect
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <button
                    onClick={() =>
                      copyToClipboard(currentAccount?.address || "")
                    }
                    className="px-2 py-1.5 hover:bg-[#131520] text-white hover:text-[#5D94FF] cursor-pointer text-center w-full h-8"
                  >
                    Copy Address
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <ConnectModal
              theme="dark"
              open={open}
              onOpenChange={(isOpen: boolean) => setOpen(isOpen)}
              // trigger={
              //   <button
              //     disabled={!!currentAccount}
              //     className="text-white outline-none py-2 px-3 rounded-3xl bg-[#0052F2]"
              //   >
              //     <span className="hidden md:inline-block">Connect Wallet</span>
              //     <span className="inline-block md:hidden text-xs">
              //       Connect
              //     </span>
              //   </button>
              // }
            >
              <button
                disabled={!!currentAccount}
                className="text-white outline-none py-2 px-3 rounded-3xl bg-[#0052F2]"
              >
                <span className="hidden md:inline-block">Connect Wallet</span>
                <span className="inline-block md:hidden text-xs">Connect</span>
              </button>
            </ConnectModal>
          )}
          <LayoutGrid
            className="md:hidden text-white cursor-pointer"
            onClick={() => setIsOpen((isOpen) => !isOpen)}
          />
        </div>
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-[#0E0F16]/90 md:hidden"
          style={{ top: "64px" }}
        />
      )}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: "hidden" }}
        className="absolute left-0 right-0 text-sm md:hidden bg-[#0E0F16]/90 backdrop-blur-md relative z-10"
      >
        <div className="flex flex-col py-3 max-w-[1440px] mx-auto px-4">
          <Link
            to="/market"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Markets
          </Link>
          <Link
            to="/portfolio"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Portfolio
          </Link>
          <Link
            to="/learn"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Learn
          </Link>
          <Link
            to="/points"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Points
          </Link>
          <Link
            to="/mint"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Mint
          </Link>
          <a
            href="https://www.sentio.xyz/"
            target="_blank"
            className="py-3 text-white/90 hover:text-white text-base"
          >
            Sentio
          </a>
          {IS_DEV && (
            <Link
              to="/test"
              className="py-3 text-white/90 hover:text-white text-base"
            >
              Test
            </Link>
          )}
        </div>
      </motion.div>
    </header>
  )
}
