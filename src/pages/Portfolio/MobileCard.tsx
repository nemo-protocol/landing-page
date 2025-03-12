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
import { ChevronDown } from "lucide-react"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useClaimLpReward from "@/hooks/actions/useClaimLpReward"
import { Transaction } from "@mysten/sui/transactions"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"

interface MobileCardProps {
  item: PortfolioItem
  selectType: "pt" | "yt" | "lp"
  pyPositionsMap: Record<
    string,
    {
      ptBalance: string
      ytBalance: string
      pyPositions: PyPosition[]
    }
  >
  lpPositionsMap: Record<
    string,
    {
      lpBalance: string
      lpPositions: LpPosition[]
    }
  >
  marketStates: Record<string, MarketState>
  selectedRewardIndex: number
  onRewardIndexChange: (index: number) => void
}

interface ItemType {
  label: string
  value: React.ReactNode
  secondaryValue?: React.ReactNode
}

export const MobileCard: React.FC<MobileCardProps> = ({
  item,
  selectType,
  pyPositionsMap,
  lpPositionsMap,
  marketStates,
  selectedRewardIndex,
  onRewardIndexChange,
}) => {
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()
  const { address } = useWallet()
  const ptBalance = pyPositionsMap?.[item.id]?.ptBalance
  const ytBalance = pyPositionsMap?.[item.id]?.ytBalance
  const lpBalance = lpPositionsMap?.[item.id]?.lpBalance
  const marketState = marketStates?.[item.marketStateId]
  const maturityDate = dayjs(parseInt(item.maturity)).format("MMM DD YYYY")

  // YT Reward相关逻辑
  const { data: ytReward, refetch: refetchYtReward } = useQueryClaimYtReward(
    item,
    {
      ytBalance: ytBalance || "0",
      pyPositions: pyPositionsMap?.[item.id]?.pyPositions || [],
      tokenType: selectType === "yt" ? 1 : 0,
    },
  )

  // LP Reward相关逻辑
  const { data: lpReward, refetch: refetchLpReward } = useQueryClaimLpReward(
    item,
    {
      lpBalance: lpBalance || "0",
      lpPositions: lpPositionsMap?.[item.id]?.lpPositions || [],
      marketState: marketState,
      rewardIndex: selectedRewardIndex,
    },
  )

  // PT/YT价格计算
  const { data: ptYtData } = useCalculatePtYt(item, marketState)

  const { mutateAsync: claimLpRewardMutation } = useClaimLpReward(item)

  async function claimLpReward(rewardIndex: number = selectedRewardIndex) {
    if (
      item.coinType &&
      address &&
      lpBalance &&
      lpPositionsMap?.[item.id]?.lpPositions?.length &&
      marketState?.rewardMetrics?.[rewardIndex]
    ) {
      try {
        const tx = new Transaction()
        await claimLpRewardMutation({
          tx,
          coinConfig: item,
          lpPositions: lpPositionsMap[item.id].lpPositions,
          rewardMetric: marketState.rewardMetrics[rewardIndex],
        })

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
        })
        // 处理成功逻辑
        console.log("Claim successful:", digest)
        await refetchLpReward()
      } catch (error) {
        console.error("Claim failed:", error)
      }
    }
  }

  const renderContent = () => {
    switch (selectType) {
      case "pt":
        return renderPTContent()
      case "yt":
        return renderYTContent()
      case "lp":
        return renderLPContent()
      default:
        return null
    }
  }

  const renderPTContent = () => {
    const ptValue = ptYtData?.ptPrice
      ? new Decimal(ptBalance).mul(ptYtData.ptPrice)
      : new Decimal(0)

    return {
      items: [
        { label: "Type", value: "PT" },
        {
          label: "Value",
          value: ptValue.gt(0) ? (
            <>
              $
              <SmallNumDisplay
                value={formatDecimalValue(ptValue, Number(item.decimal))}
              />
            </>
          ) : (
            "-"
          ),
        },
        { label: "Amount", value: <SmallNumDisplay value={ptBalance} /> },
      ] as ItemType[],
      actions: (
        <div className="flex gap-2">
          {Number(item.maturity || Infinity) > Date.now() ? (
            <>
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/swap/pt`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#00B795] h-7 text-xs text-white">
                  Buy
                </button>
              </Link>
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/sell/pt`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#FF7474] h-7 text-xs text-white">
                  Sell
                </button>
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
      ),
    }
  }

  const renderYTContent = () => {
    const ytValue = ptYtData?.ytPrice
      ? new Decimal(ytBalance).mul(ptYtData.ytPrice)
      : new Decimal(0)
    const rewardValue = new Decimal(ytReward || "0").mul(
      item.underlyingPrice || "0",
    )

    return {
      items: [
        { label: "Type", value: "YT" },
        {
          label: "Value",
          value: ytValue.gt(0) ? (
            <>
              $
              <SmallNumDisplay
                value={formatDecimalValue(ytValue, Number(item.decimal))}
              />
            </>
          ) : (
            "-"
          ),
        },
        { label: "Amount", value: <SmallNumDisplay value={ytBalance} /> },
        {
          label: "Accrued Yield",
          value: (
            <div className="flex items-center gap-1">
              <SmallNumDisplay value={ytReward || "0"} />
              <RefreshButton onRefresh={refetchYtReward} />
            </div>
          ),
          secondaryValue: rewardValue.gt(0) && (
            <>
              $
              <SmallNumDisplay
                value={formatDecimalValue(rewardValue, Number(item.decimal))}
              />
            </>
          ),
        },
      ] as ItemType[],
      actions: (
        <div className="flex gap-2">
          {Number(item.maturity || Infinity) > Date.now() ? (
            <>
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/swap/yt`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#00B795] h-7 text-xs text-white">
                  Buy
                </button>
              </Link>
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/sell/yt`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#FF7474] h-7 text-xs text-white">
                  Sell
                </button>
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
      ),
    }
  }

  const renderLPContent = () => {
    const lpValue =
      ptYtData?.lpPrice && isValidAmount(ptYtData.lpPrice)
        ? new Decimal(lpBalance).mul(ptYtData.lpPrice)
        : new Decimal(0)

    const rewardMetrics = marketState?.rewardMetrics || []
    const rewardValue =
      lpReward && rewardMetrics[selectedRewardIndex]?.tokenPrice
        ? new Decimal(lpReward).mul(
            rewardMetrics[selectedRewardIndex].tokenPrice,
          )
        : new Decimal(0)

    return {
      items: [
        { label: "Type", value: "LP" },
        {
          label: "Value",
          value: lpValue.gt(0) ? (
            <>
              $<SmallNumDisplay value={formatDecimalValue(lpValue, 6)} />
            </>
          ) : (
            "-"
          ),
        },
        { label: "Amount", value: <SmallNumDisplay value={lpBalance} /> },
        {
          label: "Incentive",
          value: (
            <div className="flex items-center gap-1">
              {rewardMetrics.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1 outline-none"
                    onClick={(e) => e.preventDefault()}
                  >
                    {rewardMetrics[selectedRewardIndex]?.tokenLogo && (
                      <img
                        src={rewardMetrics[selectedRewardIndex].tokenLogo}
                        alt="reward token"
                        className="w-4 h-4"
                      />
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-black border-white/60 !p-0"
                    align="end"
                  >
                    {rewardMetrics.map((metric, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => {
                          onRewardIndexChange(index)
                          refetchLpReward()
                        }}
                      >
                        <div className="flex items-center gap-2 cursor-pointer w-full hover:bg-white/10 py-1 px-2 rounded-md">
                          {metric.tokenLogo && (
                            <img
                              className="size-4"
                              alt={metric.tokenType}
                              src={metric.tokenLogo}
                            />
                          )}
                          <span>{metric.tokenName}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                rewardMetrics[selectedRewardIndex]?.tokenLogo && (
                  <img
                    src={rewardMetrics[selectedRewardIndex].tokenLogo}
                    alt="reward token"
                    className="w-4 h-4"
                  />
                )
              )}
              <SmallNumDisplay value={lpReward || "0"} />
              <RefreshButton onRefresh={refetchLpReward} className="shrink-0" />
            </div>
          ),
          secondaryValue: rewardValue.gt(0) && (
            <>
              $
              <SmallNumDisplay
                value={formatDecimalValue(rewardValue, Number(item.decimal))}
              />
            </>
          ),
        },
      ] as ItemType[],
      actions: (
        <>
          <button
            className={[
              "w-full rounded-3xl h-8 text-xs text-white",
              !isValidAmount(rewardValue)
                ? "bg-[#0F60FF]/50 cursor-not-allowed"
                : "bg-[#0F60FF]",
            ].join(" ")}
            disabled={!isValidAmount(rewardValue)}
            onClick={() => claimLpReward(selectedRewardIndex)}
          >
            Claim
          </button>
          {Number(item.maturity || Infinity) > Date.now() ? (
            <div className="flex gap-2 mt-2">
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/add`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white">
                  Add
                </button>
              </Link>
              <Link
                to={`/market/detail/${item.coinType}/${item.maturity}/remove`}
                className="flex-1"
              >
                <button className="w-full rounded-3xl bg-[#FF7474] h-8 text-xs text-white">
                  Remove
                </button>
              </Link>
            </div>
          ) : (
            <button
              className="w-full rounded-3xl bg-[#0F60FF] h-8 text-xs text-white mt-2"
              disabled={!lpBalance || lpBalance === "0"}
            >
              Redeem
            </button>
          )}
        </>
      ),
    }
  }

  const content = renderContent()
  if (!content) return null

  return (
    <div
      className={`rounded-xl p-4 mb-4`}
      style={{ background: getBgGradient(item.coinType) }}
    >
      <div className="flex items-start gap-2 mb-6">
        {item.underlyingCoinLogo && (
          <img src={item.underlyingCoinLogo} alt="" className="w-10 h-10" />
        )}
        <div className="flex flex-col gap-1">
          <h3 className="text-white text-base">{item.underlyingCoinName}</h3>
          <span className="text-white/50 text-xs">{maturityDate}</span>
        </div>
      </div>

      <div className="space-y-3">
        {content.items.map((item: ItemType, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-white/50 text-xs">{item.label}</span>
            <div className="text-right">
              <div className="text-white text-sm">{item.value}</div>
              {item.secondaryValue && (
                <div className="text-white/50 text-[10px]">
                  {item.secondaryValue}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {content.actions && (
        <div className="mt-6 space-y-3">{content.actions}</div>
      )}
    </div>
  )
}
