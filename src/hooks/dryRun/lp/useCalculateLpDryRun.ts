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

interface CalculateLpAmountResult {
  lpAmount: string | undefined
  ytAmount: string | undefined
  lpFeeAmount: string | undefined
  ratio: string | undefined
  error: string | undefined
  errorDetail: string | undefined
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
  const { mutateAsync: mintLpDryRun } = useMintLpDryRun(coinConfig)
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

      console.log("marketState", marketState)
      try {
        if (marketState?.lpSupply === "0") {
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
          }
        } else if (
          marketState &&
          new Decimal(marketState.totalSy).mul(0.4).lt(inputAmount)
        ) {
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
          }
        } else {
          const { lpAmount, lpValue, tradeFee } =
            await addLiquiditySingleSyDryRun({
              coinData,
              tokenType,
              addAmount: inputAmount,
              pyPositions: pyPositionData,
              coinConfig,
            })

          return {
            lpAmount: lpValue,
            ytAmount: undefined,
            lpFeeAmount: tradeFee,
            ratio: new Decimal(lpAmount).div(inputAmount).toString(),
            error: undefined,
            errorDetail: undefined,
          }
        }
      } catch (error) {
        try {
          const lpOut = await estimateLpOut(inputAmount)
          return {
            lpAmount: lpOut.lpAmount,
            ytAmount: undefined,
            lpFeeAmount: undefined,
            ratio: undefined,
            error: undefined,
            errorDetail: undefined,
          }
        } catch (errorMsg) {
          const { error, detail } = parseErrorMessage(errorMsg as string)
          return {
            error,
            ratio: undefined,
            errorDetail: detail,
            lpAmount: undefined,
            ytAmount: undefined,
            lpFeeAmount: undefined,
          }
        }
      }
    },
  })
}
