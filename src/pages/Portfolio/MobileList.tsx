import { useState } from "react"
import { PortfolioItem } from "@/queries/types/market"
import { MarketState, PyPosition, LpPosition } from "@/hooks/types"
import { MobileCard } from "./MobileCard"

// 简化后的MobileListProps
interface MobileListProps {
  slippage: string
  list: PortfolioItem[]
  selectType: "pt" | "yt" | "lp"
  pyPositionsMap: Record<string, {
    ptBalance: string
    ytBalance: string
    pyPositions: PyPosition[]
  }>
  lpPositionsMap: Record<string, {
    lpBalance: string
    lpPositions: LpPosition[]
  }>
  marketStates: Record<string, MarketState>
}

export const MobileList: React.FC<MobileListProps> = ({
  list,
  selectType,
  pyPositionsMap,
  lpPositionsMap,
  marketStates,
  slippage
}) => {
  const [selectedRewardIndex, setSelectedRewardIndex] = useState(0)
  
  return (
    <div className="md:hidden">
      {list?.map((item) => (
        <MobileCard
          slippage={slippage}
          key={`${selectType}-${item.id}`}
          item={item}
          selectType={selectType}
          pyPositionsMap={pyPositionsMap}
          lpPositionsMap={lpPositionsMap}
          marketStates={marketStates}
          selectedRewardIndex={selectedRewardIndex}
          onRewardIndexChange={setSelectedRewardIndex}
        />
      ))}
    </div>
  )
} 