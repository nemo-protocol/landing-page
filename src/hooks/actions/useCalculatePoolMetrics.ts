import Decimal from "decimal.js"
import { MarketState } from "../types"
import { safeDivide } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { BaseCoinInfo } from "@/queries/types/market"
import useQuerySyOutDryRun from "@/hooks/dryrun/useQuerySyOutDryRun.ts"

function calculatePtAPY(
  coinPrice: number,
  ptPrice: number,
  daysToExpiry: number,
): string {
  if (daysToExpiry <= 0) {
    return "0"
  }

  const ratio = safeDivide(coinPrice, ptPrice, "decimal")
  const exponent = new Decimal(365).div(daysToExpiry)
  const apy = ratio.pow(exponent).minus(1)
  return apy.mul(100).toFixed(6)
}

function calculateYtAPY(
  underlyingInterestApy: number,
  ytPrice: number,
  yearsToExpiry: number,
): string {
  if (yearsToExpiry <= 0) {
    return "0"
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

  const longYieldApy = safeDivide(ytReturnsAfterFee, ytPrice, "decimal")
    .pow(new Decimal(1).div(yearsToExpiryDecimal))
    .minus(1)

  return longYieldApy.mul(100).toFixed(6)
}


interface CalculatePoolMetricsParams {
  coinInfo: BaseCoinInfo
  marketState: MarketState
}

export default function useCalculatePoolMetrics() {
  const { mutateAsync: priceVoucherFn } = useQuerySyOutDryRun()

  const calculateMetrics = async ({
    coinInfo,
    marketState,
  }: CalculatePoolMetricsParams) => {
    if (!coinInfo) {
      throw new Error("Please select a pool")
    }

    if (!marketState) {
      throw new Error("Please provide market state")
    }

    let ptIn = "1000000"
    let syOut: string

    try {
      syOut = await priceVoucherFn({ ptIn, coinInfo })
    } catch (error) {
      // If initial call fails, try with reduced syIn
      ptIn = "100"
      syOut = await priceVoucherFn({ ptIn, coinInfo })
    }
    const ptPrice = safeDivide(
      new Decimal(coinInfo.coinPrice).mul(Number(syOut)),
      ptIn,
      "decimal",
    )
    const ytPrice = safeDivide(
      new Decimal(coinInfo.coinPrice),
      coinInfo.conversionRate,
      "decimal",
    ).sub(ptPrice)
    const suiCoinPrice = safeDivide(
      coinInfo.coinPrice,
      coinInfo.conversionRate,
      "decimal",
    )

    let poolApy = new Decimal(0)
    let tvl = new Decimal(0)

    let ptTvl = new Decimal(0)
    let syTvl = new Decimal(0)

    const daysToExpiry = new Decimal(
      (Number(coinInfo.maturity) - Date.now()) / 1000,
    )
      .div(86400)
      .toNumber()

    const ptApy = calculatePtAPY(
      Number(suiCoinPrice),
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
      Number(ytPrice),
      yearsToExpiry,
    )
    let scaled_underlying_apy = new Decimal(0)
    let scaled_pt_apy = new Decimal(0)
    if (marketState.lpSupply != "0") {
      const totalPt = new Decimal(marketState.totalPt)
      const totalSy = new Decimal(marketState.totalSy)
      ptTvl = totalPt.mul(ptPrice).div(new Decimal(10).pow(coinInfo.decimal))
      syTvl = totalSy
        .mul(coinInfo.coinPrice)
        .div(new Decimal(10).pow(coinInfo.decimal))
      tvl = syTvl.add(ptTvl)
      const rSy = totalSy.div(totalSy.add(totalPt))
      const rPt = totalPt.div(totalSy.add(totalPt))
      scaled_underlying_apy = rSy.mul(coinInfo.underlyingApy).mul(100)
      scaled_pt_apy = rPt.mul(ptApy)
      const apyIncentive = new Decimal(0)

      const swapFeeRateForLpHolder = safeDivide(
        new Decimal(coinInfo.swapFeeForLpHolder).mul(coinInfo.coinPrice),
        tvl,
        "decimal",
      )
      const expiryRate = safeDivide(new Decimal(365), daysToExpiry, "decimal")
      const swapFeeApy = swapFeeRateForLpHolder.add(1).pow(expiryRate).minus(1)
      poolApy = scaled_underlying_apy.add(scaled_pt_apy).add(apyIncentive).add(swapFeeApy.mul(100))
    }

    return {
      ptApy,
      ytApy,
      scaled_underlying_apy: scaled_underlying_apy.toString(),
      scaled_pt_apy: scaled_pt_apy.toString(),
      tvl: tvl.toString(),
      ptTvl: ptTvl.toString(),
      syTvl: syTvl.toString(),
      ptPrice: ptPrice.toString(),
      ytPrice: ytPrice.toString(),
      poolApy: poolApy.toString(),
    }
  }

  return useMutation({
    mutationFn: calculateMetrics,
  })
}
