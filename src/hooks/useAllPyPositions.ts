import { useMemo } from "react"
import Decimal from "decimal.js"
import { useSuiClientQuery } from "@mysten/dapp-kit"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { PortfolioItem } from "@/queries/types/market"

const useAllPyPositions = (items?: PortfolioItem[]) => {
  const { address } = useWallet()

  const allPositionTypes = useMemo(() => {
    if (!items) return []
    return Array.from(
      new Set(
        items
          .flatMap((item) => item.pyPositionTypeList || [item.pyPositionType])
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
      queryKey: ["queryAllPyPositionData", address, allPositionTypes],
      gcTime: 10000,
      enabled: !!address && allPositionTypes.length > 0,
      select: (data) => {
        const positions = data.data
          .map(
            (item) =>
              (
                item.data?.content as {
                  fields?: {
                    name: string
                    expiry: string
                    id: { id: string }
                    pt_balance: string
                    yt_balance: string
                    description: string
                    py_state_id: string
                  }
                }
              )?.fields,
          )
          .filter((item) => !!item)

        if (!items) return []

        return items.map((item) => {
          const pyPositions = positions.filter(
            (position) =>
              (!item.maturity ||
                position.expiry === item.maturity.toString()) &&
              (!item.pyStateId || position.py_state_id === item.pyStateId),
          )

          const ptBalance = pyPositions
            .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
            .div(1e9)
            .toString()

          const ytBalance = pyPositions
            .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
            .div(1e9)
            .toString()

          return {
            ptBalance,
            ytBalance,
            pyPositions,
          }
        })
      },
    },
  )
}

export default useAllPyPositions
