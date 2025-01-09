import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import { BaseCoinInfo } from "@/queries/types/market"
import { useQueryPriceVoucherWithCoinInfo } from "@/hooks/useQueryPriceVoucher.ts"

export function useCalculatePtYt(coinInfo?: BaseCoinInfo) {
  const { mutateAsync: priceVoucherFun } =
    useQueryPriceVoucherWithCoinInfo(coinInfo)

  return useQuery({
    queryKey: ["useCalculatePtYt", coinInfo?.marketStateId],
    queryFn: async () => {
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }
      const [, ptOut] = await priceVoucherFun()
      const ptPrice = new Decimal(coinInfo.underlyingPrice).mul(1000000).div(ptOut)
      const ytPrice = new Decimal(coinInfo.underlyingPrice).minus(ptPrice)
      const suiPrice = new Decimal(coinInfo.underlyingPrice).div(coinInfo.conversionRate)
      console.log("ptPrice", ptPrice.toFixed(10), "suiPrice", suiPrice.toFixed(10))
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
      return { ptPrice, ytPrice, ptApy, ytApy }
    },
    enabled: !!coinInfo?.decimal && !!coinInfo?.marketStateId,
    refetchInterval: 20000,
  })
}

function calculatePtAPY(
  underlyingPrice: number,
  ptPrice: number,
  daysToExpiry: number,
): string {
  if (daysToExpiry <= 0) {
    return "0"
  }

  const ratio = new Decimal(underlyingPrice).div(ptPrice)
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
  const ytPriceDecimal = new Decimal(ytPrice)
  const yearsToExpiryDecimal = new Decimal(yearsToExpiry)

  const interestReturns = underlyingInterestApyDecimal
    .plus(1)
    .pow(yearsToExpiryDecimal)
    .minus(1)

  const rewardsReturns = new Decimal(0)

  const ytReturns = interestReturns.plus(rewardsReturns)

  const ytReturnsAfterFee = ytReturns.mul(0.97)

  const longYieldApy = ytReturnsAfterFee
    .div(ytPriceDecimal)
    .pow(new Decimal(1).div(yearsToExpiryDecimal))
    .minus(1)

  return longYieldApy.mul(100).toFixed(6)
}
