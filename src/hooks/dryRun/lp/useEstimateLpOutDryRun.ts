import Decimal from "decimal.js"
import { splitSyAmount } from "@/lib/utils"
import { MarketState } from "@/hooks/types"
import { useMutation } from "@tanstack/react-query"
import { CoinConfig } from "@/queries/types/market"
import useFetchObject from "@/hooks/useFetchObject.ts"
import { useQueryPriceVoucher } from "@/hooks/index.tsx"
import useQueryLpOutFromMintLp from "../../useQueryLpOutFromMintLp"

// 定义响应数据类型
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

export function useEstimateLpOutDryRun(
  coinConfig?: CoinConfig,
  marketState?: MarketState,
) {
  const { mutateAsync: queryLpOut } = useQueryLpOutFromMintLp(coinConfig)
  const { mutateAsync: exchangeRateFun } = useFetchObject<PyStateResponse, string>()
  const { mutateAsync: priceVoucherFun } = useQueryPriceVoucher(
    coinConfig,
    false,
    "useEstimateLpOutDryRun",
  )

  return useMutation({
    mutationFn: async (syAmount: string) => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }
      if (!marketState) {
        throw new Error("Market state is required")
      }

      const exchangeRate = await exchangeRateFun({
        objectId: coinConfig.pyStateId,
        options: { showContent: true },
        format: (data) => data?.content?.fields?.py_index_stored?.fields?.value || "0",
      })

      const priceVoucher = await priceVoucherFun()

      const { syForPtValue, syValue, ptValue } = splitSyAmount(
        syAmount,
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

      return {
        lpAmount: new Decimal(lpAmount)
          .div(10 ** Number(coinConfig?.decimal))
          .toString(),
        ptValue,
        syValue,
        syForPtValue,
      }
    },
  })
}
