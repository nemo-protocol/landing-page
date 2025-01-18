import { useMemo } from "react"
import Decimal from "decimal.js"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { useSuiClientQuery } from "@mysten/dapp-kit"
import { PortfolioItem } from "@/queries/types/market"
import { LpPosition } from "../types"

const useAllLpPositions = (items?: PortfolioItem[]) => {
  const { address } = useWallet()

  const allPositionTypes = useMemo(() => {
    if (!items) return []
    return Array.from(
      new Set(
        items
          .flatMap((item) => 
            item.marketPositionTypeList || [item.marketPositionType]
          )
          .filter(Boolean),
      ),
    )
  }, [items])

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address!,
      filter: {
        MatchAny: allPositionTypes.map((type: string) => ({
          StructType: type,
        })),
      },
      options: {
        showContent: true,
      },
    },
    {
      queryKey: ["queryAllLpPositionData", address, allPositionTypes],
      gcTime: 10000,
      enabled: !!address && allPositionTypes.length > 0,
      select: (data) => {
        const positions = data.data
          .map(
            (item) =>
              (
                item.data?.content as {
                  fields?: LpPosition
                }
              )?.fields,
          )
          .filter((item) => !!item)

        if (!items) return {}

        return items.reduce((acc, item) => {
          const lpPositions = positions.filter(
            (position) =>
              (!item.maturity || position.expiry === item.maturity.toString()) &&
              (!item.marketStateId || position.market_state_id === item.marketStateId),
          )

          const lpBalance = lpPositions
            .reduce((total, coin) => total.add(coin.lp_amount), new Decimal(0))
            .div(1e9)
            .toFixed(9)

          acc[item.id] = {
            lpBalance,
            lpPositions,
          }
          
          return acc
        }, {} as Record<string, { lpBalance: string; lpPositions: LpPosition[] }>)
      },
    },
  )
}

export default useAllLpPositions 