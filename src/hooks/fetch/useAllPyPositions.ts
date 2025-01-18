import { useMemo } from "react"
import Decimal from "decimal.js"
import { useSuiClientQuery } from "@mysten/dapp-kit"
import { useWallet } from "@nemoprotocol/wallet-kit"
import { PortfolioItem } from "@/queries/types/market"
import { PyPosition } from "../types"



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
                    expiry: string
                    id: { id: string }
                    pt_balance: string
                    yt_balance: string
                    py_state_id: string
                  }
                }
              )?.fields,
          )
          .filter((item) => !!item)
          .map(({ expiry, id, pt_balance, yt_balance, py_state_id }) => ({
            id: id.id,
            maturity: expiry,
            ptBalance: pt_balance,
            ytBalance: yt_balance,
            pyStateId: py_state_id,
          }))

        if (!items) return {}

        return items.reduce(
          (acc, item) => {
            const pyPositions = positions.filter(
              (position) =>
                (!item.maturity ||
                  position.maturity === item.maturity.toString()) &&
                (!item.pyStateId || position.pyStateId === item.pyStateId),
            )

            const ptBalance = pyPositions
              .reduce(
                (total, coin) => total.add(coin.ptBalance),
                new Decimal(0),
              )
              .div(1e9)
              .toString()

            const ytBalance = pyPositions
              .reduce(
                (total, coin) => total.add(coin.ytBalance),
                new Decimal(0),
              )
              .div(1e9)
              .toString()

            acc[item.id] = {
              ptBalance,
              ytBalance,
              pyPositions,
            }

            return acc
          },
          {} as Record<
            string,
            {
              ptBalance: string
              ytBalance: string
              pyPositions: PyPosition[]
            }
          >,
        )
      },
    },
  )
}

export default useAllPyPositions
