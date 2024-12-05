import { IS_DEV } from "@/config"
import { cn } from "@/lib/utils"
import { truncateStr } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { useToast } from "@/components/Toast"
import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import HotIcon from "@/assets/images/svg/hot.svg?react"
import NemoLogo from "@/assets/images/svg/logo.svg?react"
import Network from "@/assets/images/svg/network.svg?react"
import Squares2X2Icon from "@/assets/images/svg/squares-2x2.svg?react"
import {
  ConnectModal,
  useAccounts,
  useCurrentAccount,
  useDisconnectWallet,
  useSwitchAccount,
} from "@mysten/dapp-kit"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header({ className }: { className?: string }) {
  const toast = useToast()
  const location = useLocation()
  const accounts = useAccounts()
  const [open, setOpen] = useState(false)
  const currentAccount = useCurrentAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [isDrop, setIsDrop] = useState(false)
  const { mutate: switchAccount } = useSwitchAccount()
  const { mutate: disconnect } = useDisconnectWallet()

  const subNavRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = (event: MouseEvent) => {
    if (
      subNavRef.current &&
      !subNavRef.current.contains(event.target as Node)
    ) {
      setIsDrop(false)
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <header className={cn("h-16 shrink-0", className)}>
      <div className=" w-full h-full mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-x-6 h-full">
          <Link to="/" className="flex gap-x-2">
            <NemoLogo />
            <div className="text-[#44E0C3] py-1 px-2 rounded-full bg-[#ECFBF9]/10 text-xs">
              Beta
            </div>
          </Link>
        </div>
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
              <HotIcon />
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
        </ul>
        <div className="flex items-center gap-x-6 h-full">
          <Squares2X2Icon
            className="md:hidden text-white cursor-pointer"
            onClick={() => setIsOpen((isOpen) => !isOpen)}
          />
          <span
            className={[
              "relative h-full text-center cursor-pointer flex items-center justify-center",
              "bg-transparent",
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
          <Network />
          {currentAccount?.address ? (
            <div className="relative" ref={subNavRef}>
              <div
                onClick={() => setIsDrop((isDrop) => !isDrop)}
                className="flex items-center gap-x-1 bg-[#0E0F16] px-3 py-2 rounded-full cursor-pointer"
              >
                <span>{truncateStr(currentAccount?.address || "", 4)}</span>
                <ChevronDown className="size-4" />
              </div>
              {isDrop && (
                <ul className="absolute rounded-lg w-40 right-0 mt-1 overflow-hidden z-10">
                  <li
                    className="cursor-pointer bg-[#0E0F16] px-4 py-2 text-white/50 hover:text-white w-full"
                    onClick={() => {
                      disconnect()
                    }}
                  >
                    Disconnect
                  </li>
                  <li
                    className="cursor-pointer bg-[#0E0F16] px-4 py-2 text-white/50 hover:text-white w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        currentAccount?.address || "",
                      )
                      toast.success("Address copied to clipboard")
                      setIsDrop(false)
                    }}
                  >
                    Copy Address
                  </li>
                  {accounts
                    .filter(
                      (account) => account.address !== currentAccount?.address,
                    )
                    .map((account) => (
                      <li
                        key={account.address}
                        className="cursor-pointer bg-[#0E0F16] px-4 py-2 text-white/50 hover:text-white w-full"
                        onClick={() => {
                          switchAccount(
                            { account },
                            {
                              onSuccess: () =>
                                console.log(`switched to ${account.address}`),
                            },
                          )
                        }}
                      >
                        {truncateStr(account?.address || "", 4)}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <ConnectModal
              open={open}
              onOpenChange={(isOpen) => setOpen(isOpen)}
              trigger={
                <button
                  disabled={!!currentAccount}
                  className="text-white outline-none py-2 px-3 rounded-3xl bg-[#0052F2]"
                >
                  <span className="hidden md:inline-block">Connect Wallet</span>
                  <span className="inline-block md:hidden text-xs">
                    Connect
                  </span>
                </button>
              }
            />
          )}
        </div>
      </div>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ overflow: "hidden" }}
        className="flex gap-x-8 text-sm md:hidden"
      >
        <div className="flex flex-col">
          <Link to="/market" className="py-2 text-white">
            Markets
          </Link>
          <Link to="/portfolio" className="py-2 cursor-pointer text-white">
            Portfolio
          </Link>
          <Link to="/learn" className="py-2 text-white">
            Learn
          </Link>
          {IS_DEV && (
            <Link to="/test" className="py-2 text-white">
              Test
            </Link>
          )}
        </div>
      </motion.div>
    </header>
  )
}
