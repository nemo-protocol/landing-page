import Decimal from "decimal.js"
import { MarketState } from "./types"
import { useQuery } from "@tanstack/react-query"
import { BaseCoinInfo } from "@/queries/types/market"
import useQuerySyOutDryRun from "@/hooks/dryrun/useQuerySyOutDryRun.ts"
import { safeDivide } from "@/lib/utils"

function validateCoinInfo(coinInfo: BaseCoinInfo) {
  const requiredFields = [
    "decimal",
    "maturity",
    "marketStateId",
    "underlyingApy",
    "conversionRate",
    "underlyingPrice",
    "coinPrice",
    "swapFeeForLpHolder",
  ] as const

  for (const field of requiredFields) {
    if (coinInfo[field] === undefined || coinInfo[field] === null) {
      console.error(
        `Missing required field: ${field}, coinName: ${coinInfo.coinName}, maturity: ${new Date(
          Number(coinInfo.maturity),
        ).toLocaleString()}`,
      )
      throw new Error(
        `Missing required field: ${field}, coinName: ${coinInfo.coinName}, maturity: ${new Date(
          Number(coinInfo.maturity),
        ).toLocaleString()}`,
      )
    }
  }
}

export function useCalculatePtYt(
  coinInfo?: BaseCoinInfo,
  marketState?: MarketState,
) {
  const { mutateAsync: priceVoucherFun } = useQuerySyOutDryRun()

  return useQuery({
    queryKey: ["useCalculatePtYt", coinInfo?.marketStateId],
    queryFn: async () => {
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }
      if (!marketState) {
        throw new Error("Failed get market state")
      }

      validateCoinInfo(coinInfo)

      if (marketState.lpSupply == "0") {
        return {
          ptPrice: "0",
          ytPrice: "0",
          ptApy: "0",
          ytApy: "0",
          tvl: "0",
          poolApy: "0",
        }
      }

      let ptIn = "1000000"
      let syOut: string

      try {
        syOut = await priceVoucherFun({ ptIn, coinInfo })
      } catch (error) {
        ptIn = "100"
        syOut = await priceVoucherFun({ ptIn, coinInfo })
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

      const suiPrice = safeDivide(
        coinInfo.coinPrice,
        coinInfo.conversionRate,
        "decimal",
      )

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
        Number(suiPrice),
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
          .mul(coinInfo.coinPrice)
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
          new Decimal(coinInfo.coinPrice),
        )

        const swapFeeRateForLpHolder = safeDivide(
          new Decimal(coinInfo.swapFeeForLpHolder).mul(
            coinInfo.coinPrice,
          ),
          poolValue,
          "decimal",
        )
        const expiryRate = safeDivide(new Decimal(365), daysToExpiry, "decimal")
        swapFeeApy = swapFeeRateForLpHolder.add(1).pow(expiryRate).minus(1)
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
        swapFeeApy: swapFeeApy.toString(),
      }
    },
    enabled: !!coinInfo?.decimal && !!marketState,
  })
}

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
