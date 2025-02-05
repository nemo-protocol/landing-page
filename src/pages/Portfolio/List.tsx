import Item from "./Item"
import { motion } from "framer-motion"
import { useMemo, useState } from "react"
import Loading from "@/components/Loading"
import { isValidAmount } from "@/lib/utils"
import { PortfolioItem } from "@/queries/types/market"
import SlippageSetting from "@/components/SlippageSetting"
import useMultiMarketState from "@/hooks/useMultiMarketState"
import useAllLpPositions from "@/hooks/fetch/useAllLpPositions"
import useAllPyPositions from "@/hooks/fetch/useAllPyPositions"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useWallet, ConnectModal } from "@nemoprotocol/wallet-kit"
import {
  Table,
  TableRow,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table"

interface ListProps {
  isLoading?: boolean
  list?: PortfolioItem[]
}

export default function List({ list, isLoading }: ListProps) {
  const { type } = useParams()
  const navigate = useNavigate()
  const { address } = useWallet()
  const [slippage, setSlippage] = useState("0.5")
  const [openConnect, setOpenConnect] = useState(false)
  const isConnected = useMemo(() => !!address, [address])
  const { data: pyPositionsMap = {}, isLoading: isPositionsLoading } =
    useAllPyPositions(list)

  const { data: lpPositionsMap = {}, isLoading: isLpPositionsLoading } =
    useAllLpPositions(list)

  const marketStateIds = useMemo(
    () => list?.map((item) => item.marketStateId).filter(Boolean) || [],
    [list],
  )

  const { data: marketStates = {}, isLoading: isMarketStatesLoading } =
    useMultiMarketState(marketStateIds)

  const selectType = useMemo(() => {
    if (type && ["pt", "yt", "lp"].includes(type)) {
      return type as "pt" | "yt" | "lp"
    }
    return "pt"
  }, [type])

  const handleTypeChange = (newType: "pt" | "yt" | "lp") => {
    navigate(`/portfolio/${newType}`)
  }

  const isDataLoading =
    isLoading ||
    isPositionsLoading ||
    isMarketStatesLoading ||
    isLpPositionsLoading

  const filteredLists = useMemo(() => {
    if (!list?.length) return { pt: [], yt: [], lp: [] }

    return {
      pt: list.filter((item) =>
        isValidAmount(pyPositionsMap[item.id]?.ptBalance),
      ),
      yt: list.filter((item) =>
        isValidAmount(pyPositionsMap[item.id]?.ytBalance),
      ),
      lp: list.filter((item) =>
        isValidAmount(lpPositionsMap[item.id]?.lpBalance),
      ),
    }
  }, [list, pyPositionsMap, lpPositionsMap])

  const filteredList = useMemo(() => {
    return filteredLists[selectType] || []
  }, [filteredLists, selectType])

  return (
    <motion.div
      className="w-full transition-all duration-200 ease-in-out"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4 mb-6">
          {["pt", "yt", "lp"].map((type) => (
            <span
              key={type}
              className={[
                selectType === type
                  ? "text-white font-bold bg-[#0052F2]"
                  : "text-white/80 cursor-pointer border border-[#1A1D20]",
                "rounded-full px-5 py-1.5 text-sm",
              ].join(" ")}
              onClick={() => handleTypeChange(type as "pt" | "yt" | "lp")}
            >
              {type.toUpperCase()}
            </span>
          ))}
        </div>
        <SlippageSetting slippage={slippage} setSlippage={setSlippage} />
      </div>
      <div
        className="rounded-3xl border border-white/5 overflow-hidden"
        style={{
          background: "linear-gradient(246deg, #061A40 -12%, #000308 26.64%)",
        }}
      >
        <Table>
          <TableHeader
            style={{
              background:
                "linear-gradient(246deg, #061A40 -12%, #000308 26.64%)",
            }}
          >
            <TableRow className="text-white/80 text-xs">
              <TableHead>Assets</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Value</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              {selectType === "yt" && (
                <TableHead className="text-center">Accrued Yield</TableHead>
              )}
              {selectType === "lp" && (
                <TableHead className="text-center">Incentive</TableHead>
              )}
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isConnected && isDataLoading ? (
            <TableBody>
              <TableRow>
                <td colSpan={selectType === "yt" ? 6 : 5} className="py-[60px]">
                  <Loading />
                </td>
              </TableRow>
            </TableBody>
          ) : (
            <>
              {isConnected && (
                <>
                  <TableBody className={selectType === "pt" ? "" : "hidden"}>
                    {filteredLists.pt?.map((item) => (
                      <Item
                        {...item}
                        id={item.id}
                        key={item.id}
                        selectType="pt"
                        marketState={marketStates?.[item.marketStateId]}
                        ptBalance={pyPositionsMap?.[item.id]?.ptBalance}
                        ytBalance={pyPositionsMap?.[item.id]?.ytBalance}
                        lpBalance={lpPositionsMap?.[item.id]?.lpBalance}
                        pyPositions={pyPositionsMap?.[item.id]?.pyPositions}
                        lpPositions={lpPositionsMap?.[item.id]?.lpPositions}
                      />
                    ))}
                  </TableBody>
                  <TableBody className={selectType === "yt" ? "" : "hidden"}>
                    {filteredLists.yt?.map((item) => (
                      <Item
                        {...item}
                        id={item.id}
                        key={item.id}
                        selectType="yt"
                        marketState={marketStates?.[item.marketStateId]}
                        ptBalance={pyPositionsMap?.[item.id]?.ptBalance}
                        ytBalance={pyPositionsMap?.[item.id]?.ytBalance}
                        lpBalance={lpPositionsMap?.[item.id]?.lpBalance}
                        pyPositions={pyPositionsMap?.[item.id]?.pyPositions}
                        lpPositions={lpPositionsMap?.[item.id]?.lpPositions}
                      />
                    ))}
                  </TableBody>
                  <TableBody className={selectType === "lp" ? "" : "hidden"}>
                    {filteredLists.lp?.map((item) => (
                      <Item
                        {...item}
                        id={item.id}
                        key={item.id}
                        selectType="lp"
                        marketState={marketStates?.[item.marketStateId]}
                        ptBalance={pyPositionsMap?.[item.id]?.ptBalance}
                        ytBalance={pyPositionsMap?.[item.id]?.ytBalance}
                        lpBalance={lpPositionsMap?.[item.id]?.lpBalance}
                        pyPositions={pyPositionsMap?.[item.id]?.pyPositions}
                        lpPositions={lpPositionsMap?.[item.id]?.lpPositions}
                      />
                    ))}
                  </TableBody>
                </>
              )}
            </>
          )}
        </Table>
        {!isConnected && (
          <div className="flex flex-col items-center w-full justify-center gap-y-4 py-[30px]">
            <img
              src="/images/svg/wallet-no-connect.svg"
              alt="Wallet no connect"
              className="size-[120px]"
            />
            <span className="text-white/60">
              Please connect your wallet first.
            </span>
            <ConnectModal
              open={openConnect}
              onOpenChange={(isOpen) => setOpenConnect(isOpen)}
              children={
                <button className="px-4 py-2 rounded-full bg-[#0F60FF]">
                  Connect Wallet
                </button>
              }
            />
          </div>
        )}
        {!isDataLoading && !filteredList?.length && isConnected && (
          <div className="flex flex-col items-center w-full justify-center gap-y-4 mt-[30px] py-[30px]">
            <img
              src="/images/png/empty.png"
              alt="No Data"
              className="size-[120px]"
            />
            <span className="text-white/60">
              You don't have any position yet
            </span>
            <Link to="/market" className="px-4 py-2 rounded-full bg-[#0F60FF]">
              <span className="text-white">View Markets</span>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
