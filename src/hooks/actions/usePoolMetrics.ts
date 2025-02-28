import Decimal from "decimal.js"
import { MarketState } from "../types"
import { useMutation } from "@tanstack/react-query"
import { isValidAmount, safeDivide } from "@/lib/utils"
import { CoinConfig, Incentive } from "@/queries/types/market"
import useGetConversionRateDryRun from "../dryRun/useGetConversionRateDryRun"
import useQuerySyOutByYtInDryRun from "@/hooks//dryRun/yt/useQuerySyOutByYtInDryRun"

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
  const { mutateAsync: querySyOutByYtIn } = useQuerySyOutByYtInDryRun(
    undefined,
    false,
  )
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  const mutation = useMutation({
    mutationFn: async ({
      coinInfo,
      marketState,
    }: CalculatePoolMetricsParams): Promise<PoolMetricsResult> => {
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
          incentiveApy: "",
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

      console.log("conversionRate", conversionRate)

      let ytIn = "1000000"
      let syOut: string

      try {
        const { syAmount } = await querySyOutByYtIn({
          ytAmount: ytIn,
          innerCoinConfig: coinInfo,
        })
        syOut = syAmount
      } catch (error) {
        ytIn = "100"
        try {
          const { syAmount } = await querySyOutByYtIn({
            ytAmount: ytIn,
            innerCoinConfig: coinInfo,
          })
          syOut = syAmount
        } catch (error) {
          ytIn = "10"
          try {
            const { syAmount } = await querySyOutByYtIn({
              ytAmount: ytIn,
              innerCoinConfig: coinInfo,
            })
            syOut = syAmount
          } catch (error) {
            ytIn = "1"

            try {
              const { syAmount } = await querySyOutByYtIn({
                ytAmount: ytIn,
                innerCoinConfig: coinInfo,
              })
              syOut = syAmount
            } catch (error) {
              console.log("error", error)
              throw error
            }
          }
        }
      }

      console.log("syOut", syOut)
      console.log("ytIn", ytIn)

      const underlyingPrice = safeDivide(
        coinInfo.coinPrice,
        conversionRate,
        "decimal",
      )

      console.log("underlyingPrice", underlyingPrice.toString())

      const ytPrice = safeDivide(
        new Decimal(coinInfo.coinPrice).mul(Number(syOut)),
        ytIn,
        "decimal",
      )
      console.log("ytPrice", ytPrice.toString())

      const ptPrice = underlyingPrice.sub(ytPrice)
      console.log("ptPrice", ptPrice.toString())

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

      console.log("daysToExpiry", daysToExpiry)

      const ptApy = calculatePtAPY(
        Number(underlyingPrice),
        Number(ptPrice),
        daysToExpiry,
      )
      console.log("ptApy", ptApy.toString())

      const yearsToExpiry = new Decimal(
        (Number(coinInfo.maturity) - Date.now()) / 1000,
      )
        .div(31536000)
        .toNumber()
      console.log("yearsToExpiry", yearsToExpiry)

      const ytApy = calculateYtAPY(
        Number(coinInfo.underlyingApy),
        safeDivide(ytPrice, coinInfo.underlyingPrice, "number"),
        yearsToExpiry,
      )
      console.log("ytApy", ytApy.toString())

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

      console.log("swapFeeRateForLpHolder", swapFeeRateForLpHolder.toString())
      console.log("expiryRate", expiryRate.toString())

      swapFeeApy = swapFeeRateForLpHolder
        .add(1)
        .pow(expiryRate)
        .minus(1)
        .mul(100)

      console.log("swapFeeApy", swapFeeApy.toString())

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
