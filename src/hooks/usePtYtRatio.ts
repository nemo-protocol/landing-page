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

      // console.log("marketState", marketState)

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
      const [, ptOut] = await priceVoucherFun()
      // console.log("ptOut", ptOut)
      const ptPrice = new Decimal(coinInfo.underlyingPrice)
        .mul(1000000)
        .div(ptOut)
      // console.log("underlyingPrice", coinInfo.underlyingPrice.toString())
      const ytPrice = new Decimal(coinInfo.underlyingPrice).minus(ptPrice)
      const suiPrice = new Decimal(coinInfo.underlyingPrice).div(
        coinInfo.conversionRate,
      )
      let poolApy = new Decimal(0)
      let tvl = new Decimal(0)

      let ptTvl = new Decimal(0)
      let syTvl = new Decimal(0)

      // console.log(
      //   "ptPrice",
      //   ptPrice.toFixed(10),
      //   "suiPrice",
      //   suiPrice.toFixed(10),
      // )
      const daysToExpiry = new Decimal(
        (Number(coinInfo.maturity) - Date.now()) / 1000,
      )
        .div(86400)
        .toNumber()
      // console.log("daysToExpiry", daysToExpiry)
      const ptApy = calculatePtAPY(
        Number(suiPrice),
        Number(ptPrice),
        daysToExpiry,
      )
      // console.log("ptApy", ptApy)
      const yearsToExpiry = new Decimal(
        (Number(coinInfo.maturity) - Date.now()) / 1000,
      )
        .div(31536000)
        .toNumber()
      // console.log("yearsToExpiry", yearsToExpiry)
      const ytApy = calculateYtAPY(
        Number(coinInfo.underlyingApy),
        Number(ytPrice),
        yearsToExpiry,
      )
      // console.log("ytApy", ytApy)
      if (marketState.lpSupply != "0") {
        const totalPt = new Decimal(marketState.totalPt)
        // console.log("totalPt", totalPt.toString())
        const totalSy = new Decimal(marketState.totalSy)
        // console.log("totalSy", totalSy.toString())
        ptTvl = totalPt.mul(ptPrice).div(new Decimal(10).pow(coinInfo.decimal))
        // console.log("ptTvl", ptTvl.toString())
        syTvl = totalSy
          .mul(coinInfo.underlyingPrice)
          .div(new Decimal(10).pow(coinInfo.decimal))
        // console.log("syTvl", syTvl.toString())
        tvl = syTvl.add(ptTvl)
        // console.log("tvl", tvl.toString())
        const rSy = totalSy.div(totalSy.add(totalPt))
        // console.log("rSy", rSy.toString())
        const rPt = totalPt.div(totalSy.add(totalPt))
        // console.log("rPt", rPt.toString())
        const apySy = rSy.mul(coinInfo.underlyingApy)
        // console.log("apySy", apySy.toString())
        const apyPt = rPt.mul(ptApy)
        // console.log("apyPt", apyPt.toString())
        const apyIncentive = new Decimal(0)
        // console.log("apyIncentive", apyIncentive.toString())
        const poolValue = calculatePoolValue(
          totalPt,
          totalSy,
          new Decimal(marketState.lpSupply),
          ptPrice,
          new Decimal(coinInfo.underlyingPrice),
        )
        // console.log("poolValue", poolValue.toString())
        // console.log("coinInfo", coinInfo)
        const swapFeeForLpHolder = new Decimal("0.0003284469")
        // console.log("swapFeeForLpHolder", swapFeeForLpHolder.toString())
        const swapFeeRateForLpHolder = swapFeeForLpHolder
          .mul(coinInfo.underlyingPrice)
          .div(poolValue)
        // console.log("swapFeeRateForLpHolder", swapFeeRateForLpHolder.toString())
        const swapFeeApy = swapFeeRateForLpHolder
          .add(1)
          .pow(new Decimal(365).div(daysToExpiry))
          .minus(1)
        // console.log("swapFeeApy", swapFeeApy.toString())
        poolApy = apySy.add(apyPt).add(apyIncentive).add(swapFeeApy.mul(100))
        // console.log("poolApy", poolApy.toString())
      }
      // console.log("tvl, poolApy", tvl.toFixed(10), poolApy.toFixed(10))
      // console.log({
      //   ptPrice,
      //   ytPrice,
      //   ptApy,
      //   ytApy,
      //   tvl,
      //   poolApy,
      //   ptTvl,
      //   syTvl,
      // })

      return { ptPrice, ytPrice, ptApy, ytApy, tvl, poolApy, ptTvl, syTvl }
    },
    enabled: !!coinInfo?.decimal && !!coinInfo?.marketStateId,
    // refetchInterval: 20000,
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
) {
  const lpAmount = new Decimal(1)
  const netSy = lpAmount.mul(totalSy).div(lpSupply)
  const netPt = lpAmount.mul(totalPt).div(lpSupply)
  return netSy.mul(ptPrice).add(netPt.mul(syPrice))
}
