import Decimal from "decimal.js"
import { MarketState } from "./types"
import { CoinConfig } from "@/queries/types/market"
import { safeDivide } from "@/lib/utils"
import useQuerySyOutDryRun from "./dryrun/useQuerySyOutDryRun"
import useGetConversionRateDryRun from "./dryrun/useGetConversionRateDryRun"
import { useMutation } from "@tanstack/react-query"

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
  timestamp: number
}

interface CalculatePoolMetricsParams {
  coinInfo: CoinConfig
  marketState: MarketState
}

const METRICS_CACHE_EXPIRY_TIME = 60 * 1000 // Cache expiration time: 1 minute

const getMetricsFromCache = (marketStateId: string): PoolMetricsResult | null => {
  try {
    const cachedData = localStorage.getItem(`metrics_cache_${marketStateId}`)
    if (!cachedData) return null
    
    const parsedData = JSON.parse(cachedData) as PoolMetricsResult
    const now = Date.now()
    
    if (now - parsedData.timestamp <= METRICS_CACHE_EXPIRY_TIME) {
      return parsedData
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
    localStorage.setItem(`metrics_cache_${marketStateId}`, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving to cache:", error)
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

  const ytReturnsAfterFee = ytReturns.mul(0.97)
  const ytReturnsAfterFee = ytReturns.mul(0.965)
  return safeDivide(ytReturnsAfterFee, ytPriceInAsset, "decimal")
    .pow(new Decimal(1).div(yearsToExpiryDecimal))
    .minus(1)
    .mul(100)
}

export function usePoolMetrics() {
  const { mutateAsync: priceVoucherFn } = useQuerySyOutDryRun()
  const { mutateAsync: getConversionRate } = useGetConversionRateDryRun()

  return useMutation({
    mutationFn: async ({
      coinInfo,
      marketState,
    }: CalculatePoolMetricsParams): Promise<PoolMetricsResult> => {
      // Check cache first
      const cachedResult = getMetricsFromCache(coinInfo.marketStateId)
      if (cachedResult) {
        return cachedResult
      }

      console.log(
        "coinInfo no cache",
        coinInfo.marketStateId,
        coinInfo.coinType,
      )

      // If lpSupply is 0, return zero values without making RPC calls
      if (marketState.lpSupply === "0") {
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
          timestamp: Date.now(),
        }
        saveMetricsToCache(coinInfo.marketStateId, zeroResult)
        return zeroResult
      }

      // Make RPC calls to get prices
      const conversionRate = await getConversionRate(coinInfo)

      let ptIn = "1000000"
      let syOut: string

      try {
        syOut = await priceVoucherFn({ ptIn, coinInfo })
      } catch (error) {
        ptIn = "100"
        syOut = await priceVoucherFn({ ptIn, coinInfo })
      }
      const underlyingPrice = safeDivide(
        coinInfo.coinPrice,
        conversionRate,
        "decimal",
      )
      const ptPrice = safeDivide(
        new Decimal(coinInfo.coinPrice).mul(Number(syOut)),
        ptIn,
        "decimal",
      )
      const ytPrice = safeDivide(
        new Decimal(coinInfo.coinPrice),
        conversionRate,
        "decimal",
      ).sub(ptPrice)

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
      poolApy = scaledUnderlyingApy
        .add(scaledPtApy)
        .add(apyIncentive)
        .add(swapFeeApy)

      const result: PoolMetricsResult = {
        ptApy: ptApy.toFixed(6),
        ytApy: ytApy.toFixed(6),
        scaledUnderlyingApy: scaledUnderlyingApy.toFixed(6),
        scaledPtApy: scaledPtApy.toFixed(6),
        incentiveApy: "",
        tvl: tvl.toString(),
        ptTvl: ptTvl.toString(),
        syTvl: syTvl.toString(),
        ptPrice: ptPrice.toString(),
        ytPrice: ytPrice.toString(),
        poolApy: poolApy.toFixed(6),
        swapFeeApy: swapFeeApy.toFixed(6),
        lpPrice: tvl
          .div(marketState.lpSupply)
          .mul(10 ** Number(coinInfo.decimal))
          .toString(),
        timestamp: Date.now(),
      }

      // Save to cache
      saveMetricsToCache(coinInfo.marketStateId, result)

      return result
    },
  })
}
