import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import { BaseCoinInfo } from "@/queries/types/market"
import { useQueryPriceVoucherWithCoinInfo } from "@/hooks/useQueryPriceVoucher.ts"
import useMarketStateData from "@/hooks/useMarketStateData.ts"

export function useCalculatePtYt(coinInfo?: BaseCoinInfo) {
  const { data: marketState } = useMarketStateData(coinInfo?.marketStateId)
  const { mutateAsync: priceVoucherFun } =
    useQueryPriceVoucherWithCoinInfo(coinInfo)

  return useQuery({
    queryKey: ["useCalculatePtYt", coinInfo?.marketStateId],
    queryFn: async () => {
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }
      if (!marketState) {
        throw new Error("Failed get market state")
      }
      const [, ptOut] = await priceVoucherFun()
      const ptPrice = new Decimal(coinInfo.underlyingPrice).mul(1000000).div(ptOut)
      const ytPrice = new Decimal(coinInfo.underlyingPrice).minus(ptPrice)
      const suiPrice = new Decimal(coinInfo.underlyingPrice).div(coinInfo.conversionRate)
      let poolApy = new Decimal(0)
      let tvl = new Decimal(0)

      let ptTvl = new Decimal(0)
      let syTvl = new Decimal(0)

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

      if (marketState.lpSupply != "0") {
        const totalPt  = new Decimal(marketState.totalPt);
        const totalSy  = new Decimal(marketState.totalSy);
        ptTvl = totalPt.mul(ptPrice).div(new Decimal(10).pow(coinInfo.decimal));
        syTvl = totalSy.mul(coinInfo.underlyingPrice).div(new Decimal(10).pow(coinInfo.decimal));
        tvl = syTvl.add(ptTvl);
        const rSy  = totalSy.div(totalSy.add(totalPt));
        const rPt  = totalPt.div(totalSy.add(totalPt));
        const apySy = rSy.mul(coinInfo.underlyingApy);
        const apyPt = rPt.mul(ptApy);
        const apyIncentive = new Decimal(0);
        const poolValue = calculatePoolValue(totalPt, totalSy, new Decimal(marketState.lpSupply), ptPrice, new Decimal(coinInfo.underlyingPrice));
        const swapFeeForLpHolder = new Decimal(coinInfo.swapFeeRateForLpHolder);
        const swapFeeRateForLpHolder = swapFeeForLpHolder.mul(coinInfo.underlyingPrice).div(poolValue);
        const swapFeeApy = (swapFeeRateForLpHolder.add(1)).pow(new Decimal(365).div(daysToExpiry)).minus(1);
        poolApy = apySy.add(apyPt).add(apyIncentive).add(swapFeeApy.mul(100));
      }
      console.log("tvl, poolApy",tvl.toFixed(10), poolApy.toFixed(10))
      return { ptPrice, ytPrice, ptApy, ytApy, tvl, poolApy, ptTvl, syTvl }
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

function calculatePoolValue(
  totalPt: Decimal,
  totalSy: Decimal,
  lpSupply: Decimal,
  ptPrice: Decimal,
  syPrice: Decimal,
){
  const lpAmount = new Decimal(1)
  const netSy = lpAmount.mul(totalSy).div(lpSupply)
  const netPt = lpAmount.mul(totalPt).div(lpSupply)
  return netSy.mul(ptPrice).add(netPt.mul(syPrice))
}
