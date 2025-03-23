import Decimal from "decimal.js"
import useMintLpDryRun from "./useMintLpDryRun"
import { CoinData } from "@/hooks/useCoinData"
import { CoinConfig } from "@/queries/types/market"
import { parseErrorMessage } from "@/lib/errorMapping"
import { PyPosition, MarketState } from "@/hooks/types"
import useSeedLiquidityDryRun from "./useSeedLiquidityDryRun"
import { useEstimateLpOutDryRun } from "./useEstimateLpOutDryRun"
import { useMutation, UseMutationResult } from "@tanstack/react-query"
import useAddLiquiditySingleSyDryRun from "./useAddLiquiditySingleSyDryRun"
import { NEED_MIN_VALUE_LIST } from "@/lib/constants"
import { formatDecimalValue } from "@/lib/utils"

interface CalculateLpAmountResult {
  lpAmount?: string
  ytAmount?: string
  lpFeeAmount?: string
  ratio?: string
  error?: string
  errorDetail?: string
  addType?: "mint" | "seed" | "add"
}

interface CalculateLpAmountParams {
  decimal: number
  tokenType: number
  inputAmount: string
  coinData: CoinData[]
  pyPositionData: PyPosition[]
}

export function useCalculateLpAmount(
  coinConfig: CoinConfig | undefined,
  marketState: MarketState | undefined,
): UseMutationResult<CalculateLpAmountResult, Error, CalculateLpAmountParams> {
  const { mutateAsync: mintLpDryRun } = useMintLpDryRun(coinConfig, marketState)
  const { mutateAsync: seedLiquidityDryRun } =
    useSeedLiquidityDryRun(coinConfig)
  const { mutateAsync: estimateLpOut } = useEstimateLpOutDryRun(
    coinConfig,
    marketState,
  )
  const { mutateAsync: addLiquiditySingleSyDryRun } =
    useAddLiquiditySingleSyDryRun(coinConfig)

  return useMutation({
    mutationFn: async ({
      decimal,
      coinData,
      tokenType,
      inputAmount,
      pyPositionData,
    }: CalculateLpAmountParams): Promise<CalculateLpAmountResult> => {
      if (!coinConfig) {
        throw new Error("Please select a pool")
      }

      if (!marketState) {
        throw new Error("Market state is required")
      }

      const minValue =
        NEED_MIN_VALUE_LIST.find(
          (item) => item.coinType === coinConfig.coinType,
        )?.minValue || 0

      const addValue = formatDecimalValue(
        new Decimal(inputAmount).div(10 ** decimal),
        decimal,
      )

      try {
        if (marketState?.lpSupply === "0") {
          console.log("seedLiquidityDryRun")

          if (
            tokenType === 0 &&
            new Decimal(addValue).lt(new Decimal(minValue))
          ) {
            return {
              error: `Please enter at least ${minValue} ${coinConfig.underlyingCoinName}`,
            }
          }

          const { lpAmount, ytAmount } = await seedLiquidityDryRun({
            addAmount: inputAmount,
            tokenType,
            coinData,
            pyPositions: pyPositionData,
            coinConfig,
          })

          return {
            error: undefined,
            lpFeeAmount: undefined,
            errorDetail: undefined,
            ratio: new Decimal(lpAmount).div(inputAmount).toString(),
            lpAmount: new Decimal(lpAmount).div(10 ** decimal).toFixed(decimal),
            ytAmount: new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal),
            addType: "seed",
          }
        } else if (
          marketState &&
          new Decimal(marketState.totalSy).mul(0.4).lt(inputAmount)
        ) {
          console.log("mintLpDryRun")
          const { lpAmount, ytAmount } = await mintLpDryRun({
            coinData,
            tokenType,
            coinConfig,
            addAmount: inputAmount,
            pyPositions: pyPositionData,
          })

          return {
            error: undefined,
            lpFeeAmount: undefined,
            errorDetail: undefined,
            ratio: new Decimal(lpAmount).div(inputAmount).toString(),
            lpAmount: new Decimal(lpAmount).div(10 ** decimal).toFixed(decimal),
            ytAmount: new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal),
            addType: "mint",
          }
        } else {
          try {
            console.log("addLiquiditySingleSyDryRun")
            if (
              tokenType === 0 &&
              new Decimal(addValue).lt(new Decimal(minValue))
            ) {
              return {
                error: `Please enter at least ${minValue} ${coinConfig.underlyingCoinName}`,
              }
            }

            const { lpAmount, lpValue, tradeFee } =
              await addLiquiditySingleSyDryRun({
                coinData,
                tokenType,
                addAmount: inputAmount,
                pyPositions: pyPositionData,
              })

            return {
              lpAmount: lpValue,
              ytAmount: undefined,
              lpFeeAmount: tradeFee,
              ratio: new Decimal(lpAmount).div(inputAmount).toString(),
              error: undefined,
              errorDetail: undefined,
              addType: "add",
            }
          } catch (error) {
            console.log("addLiquiditySingleSyDryRun error", error)
            console.log("mintLpDryRun")
            const { lpAmount, ytAmount } = await mintLpDryRun({
              coinData,
              tokenType,
              coinConfig,
              addAmount: inputAmount,
              pyPositions: pyPositionData,
            })

            return {
              error: undefined,
              lpFeeAmount: undefined,
              errorDetail: undefined,
              ratio: new Decimal(lpAmount).div(inputAmount).toString(),
              lpAmount: new Decimal(lpAmount)
                .div(10 ** decimal)
                .toFixed(decimal),
              ytAmount: new Decimal(ytAmount)
                .div(10 ** decimal)
                .toFixed(decimal),
              addType: "mint",
            }
          }
        }
      } catch (error) {
        try {
          console.log("estimateLpOut", error)
          const lpOut = await estimateLpOut(inputAmount)
          return {
            lpAmount: lpOut.lpAmount,
            ratio: new Decimal(lpOut.lpAmount).div(inputAmount).toString(),
            error: (error as Error)?.message,
          }
        } catch (errorMsg) {
          const { error, detail } = parseErrorMessage(errorMsg as string)
          return {
            error,
            errorDetail: detail,
          }
        }
      }
    },
  })
}
