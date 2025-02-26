import dayjs from "dayjs"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import { isValidAmount } from "@/lib/utils"
import { PortfolioItem } from "@/queries/types/market"
import SmallNumDisplay from "@/components/SmallNumDisplay"
import { formatDecimalValue } from "@/lib/utils"
import { getBgGradient } from "@/lib/gradients"
import RefreshButton from "@/components/RefreshButton"
import { MarketState, PyPosition, LpPosition } from "@/hooks/types"
import useQueryClaimYtReward from "@/hooks/useQueryClaimYtReward"
import useQueryClaimLpReward from "@/hooks/useQueryClaimLpReward"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

// 扩展 PortfolioItem 类型
interface ExtendedPortfolioItem extends PortfolioItem {
  ptPrice?: string
  ytPrice?: string
  lpPrice?: string
  ytReward?: string
  lpReward?: string
}

interface MobileCardProps {
  title: string
  items: {
    label: string
    value: React.ReactNode
    secondaryValue?: React.ReactNode
  }[]
  icon?: string
  children?: React.ReactNode
  className?: string
  coinType?: string
  maturityDate: string
}

const MobileCard = ({ 
  title, 
  items,
  icon,
  children,
  className = "",
  coinType = "",
  maturityDate
}: MobileCardProps) => (
  <div 
    className={`rounded-xl p-4 mb-4 ${className}`}
    style={{ background: getBgGradient(coinType) }}
  >
    <div className="flex items-start gap-2 mb-6">
      {icon && <img src={icon} alt="" className="w-10 h-10" />}
      <div className="flex flex-col gap-1">
        <h3 className="text-white text-base">{title}</h3>
        <span className="text-white/50 text-xs">{maturityDate}</span>
      </div>
    </div>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-white/50 text-xs">{item.label}</span>
          <div className="text-right">
            <div className="text-white text-sm">{item.value}</div>
            {item.secondaryValue && (
              <div className="text-white/50 text-[10px]">{item.secondaryValue}</div>
            )}
          </div>
        </div>
      ))}
    </div>
    {children && <div className="mt-6 space-y-3">{children}</div>}
  </div>
)

interface MobileListProps {
  list: ExtendedPortfolioItem[]
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
}) => {
  const [selectedRewardIndex, setSelectedRewardIndex] = useState(0)
  
  // Move the hook outside the map function
  const currentItem = list[0]
  const ytBalance = currentItem && pyPositionsMap?.[currentItem.id]?.ytBalance
  const pyPositions = currentItem && pyPositionsMap?.[currentItem.id]?.pyPositions

  const {
    data: ytReward,
    refetch: refetchYtReward,
  } = useQueryClaimYtReward(
    currentItem || {},
    {
      ytBalance: ytBalance || "0",
      pyPositions: pyPositions || [],
      tokenType: selectType === "yt" ? 1 : 0,
    }
  )

  // Add LP reward query
  const currentLpBalance = currentItem && lpPositionsMap?.[currentItem.id]?.lpBalance
  const currentLpPositions = currentItem && lpPositionsMap?.[currentItem.id]?.lpPositions
  const currentMarketState = currentItem && marketStates?.[currentItem.marketStateId]

  const {
    data: lpReward,
    refetch: refetchLpReward,
  } = useQueryClaimLpReward(
    currentItem || {},
    {
      lpBalance: currentLpBalance || "0",
      lpPositions: currentLpPositions || [],
      marketState: currentMarketState,
      rewardIndex: selectedRewardIndex,
    }
  )

  // Add PT/YT price calculation
  const { data: ptYtData } = useCalculatePtYt(
    currentItem || {},
    currentMarketState,
  )

  return (
    <div className="md:hidden">
      {list?.map((item) => {
        const ptBalance = pyPositionsMap?.[item.id]?.ptBalance
        const ytBalance = pyPositionsMap?.[item.id]?.ytBalance
        const lpBalance = lpPositionsMap?.[item.id]?.lpBalance
        const marketState = marketStates?.[item.marketStateId]
        const maturityDate = dayjs(parseInt(item.maturity)).format("MMM DD YYYY")

        if (selectType === "pt" && isValidAmount(ptBalance)) {
          const ptValue = ptYtData?.ptPrice ? new Decimal(ptBalance).mul(ptYtData.ptPrice) : new Decimal(0)
          
          return (
            <MobileCard
              key={`pt-${item.id}`}
              title={item.underlyingCoinName}
              icon={item.underlyingCoinLogo}
              coinType={item.coinType}
              maturityDate={maturityDate}
              items={[
                {
                  label: "Type",
                  value: "PT"
                },
                {
                  label: "Value",
                  value: ptValue.gt(0) ? (
                    <>$<SmallNumDisplay value={formatDecimalValue(ptValue, Number(item.decimal))} /></>
                  ) : "-"
                },
                {
                  label: "Amount",
                  value: <SmallNumDisplay value={ptBalance} />
                }
              ]}
            >
              <div className="flex gap-2">
                {Number(item.maturity || Infinity) > Date.now() ? (
                  <>
                    <Link
                      to={`/market/detail/${item.coinType}/${item.maturity}/swap/pt`}
                      className="flex-1"
                    >
                      <button className="w-full rounded-3xl bg-[#00B795] h-7 text-xs text-white">Buy</button>
                    </Link>
                    <Link
                      to={`/market/detail/${item.coinType}/${item.maturity}/sell/pt`}
                      className="flex-1"
                    >
                      <button className="w-full rounded-3xl bg-[#FF7474] h-7 text-xs text-white">Sell</button>
                    </Link>
                  </>
                ) : (
                  <button 
                    className="w-full rounded-3xl bg-[#0F60FF] h-7 text-xs text-white"
                    disabled={!ptBalance || ptBalance === "0"}
                  >
                    Redeem
                  </button>
                )}
              </div>
            </MobileCard>
          )
        }

        if (selectType === "yt" && isValidAmount(ytBalance)) {
          const ytValue = ptYtData?.ytPrice ? new Decimal(ytBalance).mul(ptYtData.ytPrice) : new Decimal(0)
          const rewardValue = new Decimal(ytReward || "0").mul(item.underlyingPrice || "0")
          
          return (
            <MobileCard
              key={`yt-${item.id}`}
              title={item.underlyingCoinName}
              icon={item.underlyingCoinLogo}
              coinType={item.coinType}
              maturityDate={maturityDate}
              items={[
                {
                  label: "Type",
                  value: "YT"
                },
                {
                  label: "Value",
                  value: ytValue.gt(0) ? (
                    <>$<SmallNumDisplay value={formatDecimalValue(ytValue, Number(item.decimal))} /></>
                  ) : "-"
                },
                {
                  label: "Amount",
                  value: <SmallNumDisplay value={ytBalance} />
                },
                {
                  label: "Accrued Yield",
                  value: (
                    <div className="flex items-center gap-1">
                      <SmallNumDisplay value={ytReward || "0"} />
                      <RefreshButton onRefresh={refetchYtReward} />
                    </div>
                  ),
                  secondaryValue: rewardValue.gt(0) && (
                    <>$<SmallNumDisplay value={formatDecimalValue(rewardValue, Number(item.decimal))} /></>
                  )
                }
              ]}
            >
              <div className="flex gap-2">
                {Number(item.maturity || Infinity) > Date.now() ? (
                  <>
                    <Link
                      to={`/market/detail/${item.coinType}/${item.maturity}/swap/yt`}
                      className="flex-1"
                    >
                      <button className="w-full rounded-3xl bg-[#00B795] h-7 text-xs text-white">Buy</button>
                    </Link>
                    <Link
                      to={`/market/detail/${item.coinType}/${item.maturity}/sell/yt`}
                      className="flex-1"
                    >
                      <button className="w-full rounded-3xl bg-[#FF7474] h-7 text-xs text-white">Sell</button>
                    </Link>
                  </>
                ) : (
                  <button 
                    className="w-full rounded-3xl bg-[#0F60FF] h-7 text-xs text-white"
                    disabled={!isValidAmount(ytBalance)}
                  >
                    Claim
                  </button>
                )}
              </div>
            </MobileCard>
          )
        }

        if (selectType === "lp" && isValidAmount(lpBalance)) {
          const lpValue = ptYtData?.lpPrice && isValidAmount(ptYtData.lpPrice)
            ? new Decimal(lpBalance).mul(ptYtData.lpPrice)
            : new Decimal(0)
          
          const rewardMetrics = marketState?.rewardMetrics || []
          const rewardValue = lpReward && rewardMetrics[selectedRewardIndex]?.tokenPrice
            ? new Decimal(lpReward).mul(rewardMetrics[selectedRewardIndex].tokenPrice)
            : new Decimal(0)
          
          return (
            <MobileCard
              key={`lp-${item.id}`}
              title={item.underlyingCoinName}
              icon={item.underlyingCoinLogo}
              coinType={item.coinType}
              maturityDate={maturityDate}
              items={[
                {
                  label: "Type",
                  value: "LP"
                },
                {
                  label: "Value",
                  value: lpValue.gt(0) ? (
                    <>$<SmallNumDisplay value={formatDecimalValue(lpValue, 6)} /></>
                  ) : "-"
                },
                {
                  label: "Amount",
                  value: <SmallNumDisplay value={lpBalance} />
                },
                {
                  label: "Incentive",
                  value: (
                    <div className="flex items-center gap-1">
                      {rewardMetrics[selectedRewardIndex]?.tokenLogo && (
                        <img
                          src={rewardMetrics[selectedRewardIndex].tokenLogo}
                          alt="reward token"
                          className="w-4 h-4"
                        />
                      )}
                      <SmallNumDisplay value={lpReward || "0"} />
                      <RefreshButton onRefresh={refetchLpReward} className="shrink-0" />
                    </div>
                  ),
                  secondaryValue: rewardValue.gt(0) && (
                    <>$<SmallNumDisplay value={formatDecimalValue(rewardValue, Number(item.decimal))} /></>
                  )
                }
              ]}
            >
              {/* Claim Button Row */}
              {rewardMetrics.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white">
                      Claim
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {rewardMetrics.map((metric, index) => (
                      <DropdownMenuItem
                        key={metric.tokenType}
                        onClick={() => {
                          setSelectedRewardIndex(index)
                        }}
                        className="flex items-center gap-2"
                      >
                        <span>Claim {metric.tokenType ?? `Reward ${index + 1}`}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button 
                  className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white"
                  disabled={!lpBalance || lpBalance === "0"}
                >
                  Claim
                </button>
              )}

              {/* Add/Remove or Redeem Row */}
              {Number(item.maturity || Infinity) > Date.now() ? (
                <div className="flex gap-2">
                  <Link
                    to={`/market/detail/${item.coinType}/${item.maturity}/add`}
                    className="flex-1"
                  >
                    <button className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white">Add</button>
                  </Link>
                  <Link
                    to={`/market/detail/${item.coinType}/${item.maturity}/remove`}
                    className="flex-1"
                  >
                    <button className="w-full rounded-3xl bg-[#FF7474] h-8 text-xs text-white">Remove</button>
                  </Link>
                </div>
              ) : (
                <button 
                  className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white"
                  disabled={!lpBalance || lpBalance === "0"}
                >
                  Redeem
                </button>
              )}
            </MobileCard>
          )
        }

        return null
      })}
    </div>
  )
} 