import Decimal from "decimal.js"
import { CoinData } from "@/types"
import useMintLpDryRun from "./useMintLpDryRun"
import { formatDecimalValue } from "@/lib/utils"
import { CoinConfig } from "@/queries/types/market"
import { NEED_MIN_VALUE_LIST } from "@/lib/constants"
import { parseErrorMessage } from "@/lib/errorMapping"
import { PyPosition, MarketState } from "@/hooks/types"
import useSeedLiquidityDryRun from "./useSeedLiquidityDryRun"
import { useEstimateLpOutDryRun } from "./useEstimateLpOutDryRun"
import { useMutation, UseMutationResult } from "@tanstack/react-query"
import useAddLiquiditySingleSyDryRun from "./useAddLiquiditySingleSyDryRun"

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
  vaultId?: string
  slippage: string
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
      vaultId,
      decimal,
      slippage,
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
            vaultId,
            slippage,
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
            vaultId,
            slippage,
            coinData,
            tokenType,
            coinConfig,
            amount: inputAmount,
            pyPositions: pyPositionData,
          })

          return {
            addType: "mint",
            ratio: new Decimal(lpAmount).div(inputAmount).toString(),
            lpAmount: new Decimal(lpAmount).div(10 ** decimal).toFixed(decimal),
            ytAmount: new Decimal(ytAmount).div(10 ** decimal).toFixed(decimal),
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
                vaultId,
                slippage,
                coinData,
                tokenType,
                addAmount: inputAmount,
                pyPositions: pyPositionData,
              })

            return {
              addType: "add",
              lpAmount: lpValue,
              lpFeeAmount: tradeFee,
              ratio: new Decimal(lpAmount).div(inputAmount).toString(),
            }
          } catch (error) {
            console.log("addLiquiditySingleSyDryRun error", error)
            console.log("mintLpDryRun")

            const { lpAmount, ytAmount } = await mintLpDryRun({
              vaultId,
              slippage,
              coinData,
              tokenType,
              coinConfig,
              amount: inputAmount,
              pyPositions: pyPositionData,
            })

            return {
              addType: "mint",
              ratio: new Decimal(lpAmount).div(inputAmount).toString(),
              lpAmount: new Decimal(lpAmount)
                .div(10 ** decimal)
                .toFixed(decimal),
              ytAmount: new Decimal(ytAmount)
                .div(10 ** decimal)
                .toFixed(decimal),
            }
          }
        }
      } catch (errorMsg) {
        console.log("errorMsg", errorMsg)
        try {
          const { error } = parseErrorMessage((errorMsg as Error).message)
          const { lpAmount } = await estimateLpOut(inputAmount)
          return {
            error,
            lpAmount,
            ratio: new Decimal(lpAmount).div(inputAmount).toString(),
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
