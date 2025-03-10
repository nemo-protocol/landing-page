import { useRef } from "react"
import Decimal from "decimal.js"
import { MarketState } from "../types"
import { splitSyAmount } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useFetchObject from "@/hooks/useFetchObject.ts"
import { useQueryPriceVoucher } from "@/hooks/index.tsx"
import useQueryLpOutFromMintLp from "../useQueryLpOutFromMintLp"

interface PyStateResponse {
  content: {
    fields: {
      py_index_stored: {
        fields: {
          value: string;
        };
      };
    };
  };
}

export function useAddLiquidityRatio(
  coinConfig?: CoinConfig,
  marketState?: MarketState,
) {
  const lastPowerRef = useRef(0)
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
  const { mutateAsync: exchangeRateFun } = useFetchObject<PyStateResponse, string>()
  const { mutateAsync: priceVoucherFun } = useQueryPriceVoucher(
    coinConfig,
    false,
    "useAddLiquidityRatio",
  )

  return useMutation({
    mutationFn: async () => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!marketState) {
        throw new Error("not found market")
      }
      const exchangeRate = await exchangeRateFun({
        objectId: coinConfig.pyStateId,
        options: { showContent: true },
        format: (data) => data?.content?.fields?.py_index_stored?.fields?.value || "0",
      })

      const priceVoucher = await priceVoucherFun()
      const decimal = 5

      const calculateRatio = async (
        power = lastPowerRef.current,
      ): Promise<string> => {
        if (power >= decimal) return ""

        const safeDecimal = Math.max(decimal - power, 0)
        try {
          const baseAmount = new Decimal(10).pow(safeDecimal).toString()

          const { syValue, ptValue } = splitSyAmount(
            baseAmount,
            marketState.lpSupply,
            marketState.totalSy,
            marketState.totalPt,
            exchangeRate,
            priceVoucher.toString(),
          )

          const lpAmount =
            marketState.lpSupply == "0"
              ? (Math.sqrt(Number(ptValue) * Number(syValue)) - 1000).toString()
              : (await queryLpOut({ ptValue, syValue }))[0]

          const ratio = new Decimal(lpAmount).div(baseAmount).toString()

          lastPowerRef.current = power
          return ratio
        } catch (error) {
          if (power < decimal) {
            return calculateRatio(power + 1)
          }
          throw error
        }
      }

      return calculateRatio()
    },
  })
}
