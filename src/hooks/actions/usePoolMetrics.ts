import Decimal from "decimal.js"
import { MarketState } from "../types"
import { useMutation } from "@tanstack/react-query"
import { isValidAmount, safeDivide } from "@/lib/utils"
import useQuerySyOutByYtIn from "./sy/useQuerySyOutByYtIn"
import useQueryPtOutBySyIn from "./sy/useQueryPtOutBySyIn"
import { CoinConfig, Incentive } from "@/queries/types/market"
import useGetConversionRateDryRun from "../dryRun/useGetConversionRateDryRun"

export interface PoolMetricsResult {
  ptApy: string
  ytApy: string
  incentiveApy: string
  scaledUnderlyingApy: string
  scaledPtApy: string
  tvl: string
  ptTvl: string
  syTvl: string
  ptPrice: string
  ytPrice: string
  poolApy: string
  swapFeeApy: string
  lpPrice: string
  marketState: MarketState
  incentives: Incentive[]
}

interface CalculatePoolMetricsParams {
  coinInfo: CoinConfig
  marketState: MarketState
}

const METRICS_CACHE_EXPIRY_TIME = 60 * 1000 // Cache expiration time: 1 minute

interface CachedData {
  data: PoolMetricsResult
  timestamp: number
}

const getMetricsFromCache = (
  marketStateId: string,
): PoolMetricsResult | null => {
  try {
    const cachedData = localStorage.getItem(`metrics_cache_${marketStateId}`)
    if (!cachedData) return null

    const parsedData = JSON.parse(cachedData) as CachedData
    const now = Date.now()

    if (now - parsedData.timestamp <= METRICS_CACHE_EXPIRY_TIME) {
      return parsedData.data
    }

    localStorage.removeItem(`metrics_cache_${marketStateId}`)
    return null
  } catch (error) {
    console.error("Error reading from cache:", error)
    return null
  }
}

const saveMetricsToCache = (marketStateId: string, data: PoolMetricsResult) => {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(
      `metrics_cache_${marketStateId}`,
      JSON.stringify(cacheData),
    )
  } catch (error) {
    console.error("Error saving to cache:", error)
  }
}

export const clearMetricsCache = (marketStateId: string) => {
  try {
    localStorage.removeItem(`metrics_cache_${marketStateId}`)
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

function calculatePtAPY(
  coinPrice: number,
  ptPrice: number,
  daysToExpiry: number,
): Decimal {
  if (daysToExpiry <= 0) {
    return new Decimal(0)
  }

  const ratio = safeDivide(coinPrice, ptPrice, "decimal")
  const exponent = new Decimal(365).div(daysToExpiry)
  return ratio.pow(exponent).minus(1).mul(100)
}

function calculateYtAPY(
  underlyingInterestApy: number,
  ytPriceInAsset: number,
  yearsToExpiry: number,
): Decimal {
  if (yearsToExpiry <= 0) {
    return new Decimal(0)
  }

  const underlyingInterestApyDecimal = new Decimal(underlyingInterestApy)
  const yearsToExpiryDecimal = new Decimal(yearsToExpiry)

  const interestReturns = underlyingInterestApyDecimal
    .plus(1)
    .pow(yearsToExpiryDecimal)
    .minus(1)

  const rewardsReturns = new Decimal(0)

  const ytReturns = interestReturns.plus(rewardsReturns)

  const ytReturnsAfterFee = ytReturns.mul(0.965)
  return safeDivide(ytReturnsAfterFee, ytPriceInAsset, "decimal")
    .pow(new Decimal(1).div(yearsToExpiryDecimal))
    .minus(1)
    .mul(100)
}

export function usePoolMetrics() {
  const { mutateAsync: querySyOutByYtIn } = useQuerySyOutByYtIn()
  const { mutateAsync: queryPtOutBySyIn } = useQueryPtOutBySyIn()
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  const mutation = useMutation({
    mutationFn: async ({
      coinInfo,
      marketState,
    }: CalculatePoolMetricsParams): Promise<PoolMetricsResult> => {
      console.log("coinConfig", coinInfo)
      // Check cache first
      const cachedResult = getMetricsFromCache(coinInfo.marketStateId)
      if (cachedResult) {
        return cachedResult
      }

      console.log("cachedResult", cachedResult)

      // If lpSupply is 0, return zero values without making RPC calls
      if (!isValidAmount(marketState.lpSupply)) {
        console.log("isValidAmount lpSupply is 0")

        const zeroResult: PoolMetricsResult = {
          ptPrice: "0",
          ytPrice: "0",
          ptApy: "0",
          ytApy: "0",
          scaledUnderlyingApy: "0",
          scaledPtApy: "0",
          tvl: "0",
          poolApy: "0",
          incentiveApy: "0",
          ptTvl: "0",
          syTvl: "0",
          swapFeeApy: "0",
          lpPrice: "0",
          marketState,
          incentives: [],
        }
        // saveMetricsToCache(coinInfo.marketStateId, zeroResult)
        return zeroResult
      }

      // Make RPC calls to get prices
      const conversionRate = await getConversionRate(coinInfo)

      const underlyingPrice = safeDivide(
        coinInfo.coinPrice,
        conversionRate,
        "decimal",
      )

      let ptPrice: Decimal
      let ytPrice: Decimal

      try {
        const { ytIn, syOut } = await querySyOutByYtIn(coinInfo)
        ytPrice = safeDivide(
          new Decimal(coinInfo.coinPrice).mul(Number(syOut)),
          ytIn,
          "decimal",
        )
        ptPrice = underlyingPrice.sub(ytPrice)
      } catch (error) {
        try {
          const { syIn, ptOut } = await queryPtOutBySyIn(coinInfo)
          ptPrice = safeDivide(
            new Decimal(coinInfo.coinPrice).mul(Number(ptOut)),
            Number(syIn),
            "decimal",
          )
          ytPrice = underlyingPrice.sub(ptPrice)
        } catch (syError) {
          console.log("SY calc error", syError)
          throw new Error("All price calculation methods failed")
        }
      }

      // Calculate metrics
      let poolApy = new Decimal(0)
      let tvl = new Decimal(0)
      let ptTvl = new Decimal(0)
      let syTvl = new Decimal(0)
      let swapFeeApy = new Decimal(0)

      const daysToExpiry = new Decimal(
        (Number(coinInfo.maturity) - Date.now()) / 1000,
      )
        .div(86400)
        .toNumber()

      const ptApy = calculatePtAPY(
        Number(underlyingPrice),
        Number(ptPrice),
        daysToExpiry,
      )

      const yearsToExpiry = new Decimal(
        (Number(coinInfo.maturity) - Date.now()) / 1000,
      )
        .div(31536000)
        .toNumber()

      const ytApy = calculateYtAPY(
        Number(coinInfo.underlyingApy),
        safeDivide(ytPrice, coinInfo.underlyingPrice, "number"),
        yearsToExpiry,
      )

      let scaledUnderlyingApy = new Decimal(0)
      let scaledPtApy = new Decimal(0)

      const totalPt = new Decimal(marketState.totalPt)
      const totalSy = new Decimal(marketState.totalSy)
      ptTvl = totalPt.mul(ptPrice).div(new Decimal(10).pow(coinInfo.decimal))
      syTvl = totalSy
        .mul(coinInfo.coinPrice)
        .div(new Decimal(10).pow(coinInfo.decimal))
      tvl = syTvl.add(ptTvl)
      const rSy = totalSy.div(totalSy.add(totalPt))
      const rPt = totalPt.div(totalSy.add(totalPt))
      scaledUnderlyingApy = rSy.mul(coinInfo.underlyingApy).mul(100)
      scaledPtApy = rPt.mul(ptApy)
      const apyIncentive = new Decimal(0)

      const swapFeeRateForLpHolder = safeDivide(
        new Decimal(coinInfo.swapFeeForLpHolder).mul(coinInfo.coinPrice),
        tvl,
        "decimal",
      )
      const expiryRate = safeDivide(new Decimal(365), daysToExpiry, "decimal")

      swapFeeApy = swapFeeRateForLpHolder
        .add(1)
        .pow(expiryRate)
        .minus(1)
        .mul(100)

      // Calculate reward APYs

      const incentives = marketState?.rewardMetrics
        ? marketState.rewardMetrics.map(
            ({ tokenPrice, tokenType, dailyEmission, tokenLogo }) => ({
              tokenLogo,
              tokenType,
              tokenPrice,
              apy: safeDivide(
                new Decimal(tokenPrice).mul(dailyEmission),
                tvl,
                "decimal",
              )
                .plus(1)
                .pow(365)
                .minus(1)
                .mul(100)
                .toString(),
            }),
          )
        : []

      // Sum up all reward APYs
      const incentiveApy =
        incentives?.reduce(
          (sum, incentive) => sum.plus(incentive.apy),
          new Decimal(0),
        ) || new Decimal(0)

      poolApy = scaledUnderlyingApy
        .add(scaledPtApy)
        .add(apyIncentive)
        .add(swapFeeApy)
        .add(incentiveApy)

      const result: PoolMetricsResult = {
        ptApy: ptApy.toString(),
        ytApy: ytApy.toString(),
        scaledUnderlyingApy: scaledUnderlyingApy.toString(),
        scaledPtApy: scaledPtApy.toString(),
        incentiveApy: incentiveApy.toString(),
        tvl: tvl.toString(),
        ptTvl: ptTvl.toString(),
        syTvl: syTvl.toString(),
        ptPrice: ptPrice.toString(),
        ytPrice: ytPrice.toString(),
        poolApy: poolApy.toString(),
        swapFeeApy: swapFeeApy.toString(),
        lpPrice: tvl
          .div(marketState.lpSupply)
          .mul(10 ** Number(coinInfo.decimal))
          .toString(),
        marketState,
        incentives,
      }

      // Save to cache
      saveMetricsToCache(coinInfo.marketStateId, result)

      return result
    },
  })

  // Add refresh method that clears cache before mutation
  const refresh = async (params: CalculatePoolMetricsParams) => {
    clearMetricsCache(params.coinInfo.marketStateId)
    return mutation.mutateAsync(params)
  }

  return {
    ...mutation,
    refresh,
  }
}
