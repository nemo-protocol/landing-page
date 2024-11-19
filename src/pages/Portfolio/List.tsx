import Item from "./Item"
import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"
import { useState } from "react"
import { motion } from "framer-motion"
import Empty from "@/assets/images/png/empty.png"
import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"
import WalletNotConnect from "@/assets/images/png/WalletNotConnect.png"
import { Link } from "react-router-dom"
import { PortfolioItem } from "@/queries/types/market"

export default function List({ list }: { list?: PortfolioItem[] }) {
  const { isConnected } = useCurrentWallet()
  const [openConnect, setOpenConnect] = useState(false)
  const [selectType, setSelectType] = useState<"pt" | "yt" | "lp">("pt")
  return (
    <motion.div
      className="w-full transition-all duration-200 ease-in-out"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-x-4 mb-5">
        <span
          className={
            selectType === "pt"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "pt") {
              setSelectType("pt")
            }
          }}
        >
          PT
        </span>
        <span
          className={
            selectType === "yt"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "yt") {
              setSelectType("yt")
            }
          }}
        >
          YT
        </span>
        <span
          className={
            selectType === "lp"
              ? "text-white font-bold"
              : "text-white/80 cursor-pointer"
          }
          onClick={() => {
            if (selectType !== "lp") {
              setSelectType("lp")
            }
          }}
        >
          LP
        </span>
      </div>
      <Table>
        <TableHeader className="bg-[#1A1D1E]">
          <TableRow className="text-white/80 text-xs">
            <TableHead>Assets</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-center">Value</TableHead>
            <TableHead className="text-center">Amount</TableHead>
            {selectType === "yt" && (
              <TableHead className="text-center">Rewards</TableHead>
            )}
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {isConnected && list?.length && (
          <TableBody>
            {list.map((item) => (
              <Item
                {...item}
                selectType={selectType}
                key={item.name + item.maturity}
              />
            ))}
          </TableBody>
        )}
      </Table>
      {!isConnected && (
        <div className="flex flex-col items-center w-full justify-center gap-y-4 mt-[30px]">
          <img
            src={WalletNotConnect}
            alt="Wallet no connect"
            className="size-[120px]"
          />
          <span className="text-white/60">
            Please connect your wallet first.
          </span>
          <ConnectModal
            open={openConnect}
            onOpenChange={(isOpen) => setOpenConnect(isOpen)}
            trigger={
              <button className="px-4 py-2 rounded-full bg-[#0F60FF]">
                Connect Wallet
              </button>
            }
          />
        </div>
      )}
      {!list?.length && isConnected && (
        <div className="flex flex-col items-center w-full justify-center gap-y-4 mt-[30px]">
          <img src={Empty} alt="No Data" className="size-[120px]" />
          <span className="text-white/60">You don't have any position yet</span>
          <Link to="/market" className="px-4 py-2 rounded-full bg-[#0F60FF]">
            <span className="text-white">View Markets</span>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
