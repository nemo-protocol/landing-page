import { useState } from "react"
import { IS_DEV } from "@/config"
import { motion } from "framer-motion"
import { truncateStr } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import HotIcon from "@/assets/images/svg/hot.svg?react"
import NemoLogo from "@/assets/images/svg/logo.svg?react"
import Network from "@/assets/images/svg/network.svg?react"
import Squares2X2Icon from "@/assets/images/svg/squares-2x2.svg?react"
import {
  ConnectModal,
  useAccounts,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSwitchAccount,
} from "@mysten/dapp-kit"

export default function Header() {
  const location = useLocation()
  const accounts = useAccounts()
  const [open, setOpen] = useState(false)
  const currentAccount = useCurrentAccount()
  const { isConnected } = useCurrentWallet()
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: switchAccount } = useSwitchAccount()
  const { mutate: disconnect } = useDisconnectWallet()

  return (
    <header className="py-6">
      <div className=" w-full mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-x-6">
          <Link to="/" className="flex gap-x-2">
            <NemoLogo />
            <div className="text-[#44E0C3] py-1 px-2 rounded-full bg-[#ECFBF9]/10 text-xs">
              Beta
            </div>
          </Link>
          <ul className="md:flex items-center text-sm hidden">
            <li
              className={[
                "text-center bg-transparent py-2 rounded-full cursor-pointer hidden",
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
            <li
              className={[
                "w-24 text-center bg-transparent py-2 rounded-full cursor-pointer",
              ].join(" ")}
            >
              <Link
                to="/market"
                className={
                  location.pathname === "/market"
                    ? "text-white"
                    : "text-white/50"
                }
              >
                Market
              </Link>
            </li>
            <li
              className={[
                "w-24 text-center bg-transparent rounded-full cursor-pointer",
              ].join(" ")}
            >
              <Link
                to="/portfolio"
                className={
                  location.pathname === "/portfolio"
                    ? "text-white"
                    : "text-white/50"
                }
              >
                Portfolio
              </Link>
            </li>
            <li
              className={[
                "w-24 text-center bg-transparent rounded-full cursor-pointer",
              ].join(" ")}
            >
              <Link
                to="/learn"
                className={
                  location.pathname === "/learn"
                    ? "text-white"
                    : "text-white/50"
                }
              >
                Learn
              </Link>
            </li>
            {IS_DEV && (
              <li
                className={[
                  "w-24 text-center bg-transparent rounded-full cursor-pointer",
                ].join(" ")}
              >
                <Link
                  to="/test"
                  className={
                    location.pathname === "/test"
                      ? "text-white"
                      : "text-white/50"
                  }
                >
                  Test
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div className="flex items-center gap-x-6">
          <Squares2X2Icon
            className="md:hidden text-white cursor-pointer"
            onClick={() => setIsOpen((isOpen) => !isOpen)}
          />
          <Network />
          {isConnected ? (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-x-1 bg-[#0E0F16] px-3 py-2 rounded-full"
              >
                <span>{truncateStr(currentAccount?.address || "", 4)}</span>
                <ChevronDown className="size-4" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu rounded-sm w-40"
              >
                <li
                  className="cursor-pointer bg-[#0E0F16] px-2 py-1.5 text-white/50 hover:text-white w-full"
                  onClick={() => disconnect()}
                >
                  Disconnect
                </li>
                {accounts
                  .filter(
                    (account) => account.address !== currentAccount?.address,
                  )
                  .map((account) => (
                    <li
                      key={account.address}
                      className="cursor-pointer bg-[#0E0F16] px-2 py-1.5 text-white/50 hover:text-white w-full"
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
                  Connect Wallet
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
