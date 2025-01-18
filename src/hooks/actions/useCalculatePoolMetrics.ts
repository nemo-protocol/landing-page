import Decimal from "decimal.js"
import { MarketState } from "../types"
import { safeDivide } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { BaseCoinInfo } from "@/queries/types/market"
import useQueryPtOutDryRun from "@/hooks/dryrun/useQueryPtOutDryRun"

function calculatePtAPY(
  underlyingPrice: number,
  ptPrice: number,
  daysToExpiry: number,
): string {
  if (daysToExpiry <= 0) {
    return "0"
  }

  const ratio = safeDivide(underlyingPrice, ptPrice, "decimal")
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

function calculatePoolValue(
  totalPt: Decimal,
  totalSy: Decimal,
  lpSupply: Decimal,
  ptPrice: Decimal,
  syPrice: Decimal,
) {
  const lpAmount = new Decimal(1)
  const netSy = safeDivide(lpAmount.mul(totalSy), lpSupply, "decimal")
  const netPt = safeDivide(lpAmount.mul(totalPt), lpSupply, "decimal")
  return netSy.mul(ptPrice).add(netPt.mul(syPrice))
}

interface CalculatePoolMetricsParams {
  coinInfo: BaseCoinInfo
  marketState: MarketState
}

export default function useCalculatePoolMetrics() {
  const { mutateAsync: priceVoucherFn } = useQueryPtOutDryRun()

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

    let syIn = "1000000"
    let ptOut: string

    try {
      ptOut = await priceVoucherFn({ syIn, coinInfo })
    } catch (error) {
      // If initial call fails, try with reduced syIn
      syIn = "100"
      ptOut = await priceVoucherFn({ syIn, coinInfo })
    }
    const ptPrice = safeDivide(new Decimal(coinInfo.underlyingPrice).mul(Number(syIn)), ptOut, "decimal")
    const ytPrice = new Decimal(coinInfo.underlyingPrice).minus(ptPrice)
    const suiCoinPrice = safeDivide(
      coinInfo.underlyingPrice,
      coinInfo.conversionRate,
      "decimal",
    )
    console.log("price",ptOut, syIn, suiCoinPrice.toFixed(5), ptPrice.toFixed(5), ytPrice.toFixed(5))
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

    if (marketState.lpSupply != "0") {
      const totalPt = new Decimal(marketState.totalPt)
      const totalSy = new Decimal(marketState.totalSy)
      ptTvl = totalPt.mul(ptPrice).div(new Decimal(10).pow(coinInfo.decimal))
      syTvl = totalSy
        .mul(coinInfo.underlyingPrice)
        .div(new Decimal(10).pow(coinInfo.decimal))
      tvl = syTvl.add(ptTvl)
      const rSy = totalSy.div(totalSy.add(totalPt))
      const rPt = totalPt.div(totalSy.add(totalPt))
      const apySy = rSy.mul(coinInfo.underlyingApy)
      const apyPt = rPt.mul(ptApy)
      const apyIncentive = new Decimal(0)
      const poolValue = calculatePoolValue(
        totalPt,
        totalSy,
        new Decimal(marketState.lpSupply),
        ptPrice,
        new Decimal(coinInfo.underlyingPrice),
      )

      const swapFeeRateForLpHolder = safeDivide(
        new Decimal(coinInfo.swapFeeForLpHolder).mul(coinInfo.underlyingPrice),
        poolValue,
        "decimal",
      )
      const expiryRate = safeDivide(new Decimal(365), daysToExpiry, "decimal")
      const swapFeeApy =
        swapFeeRateForLpHolder.add(1).pow(expiryRate).minus(1)
      poolApy = apySy.add(apyPt).add(apyIncentive).add(swapFeeApy.mul(100))
    }

    return {
      ptApy,
      ytApy,
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
