import Decimal from "decimal.js"
import { useQuery } from "@tanstack/react-query"
import { CoinInfo } from "@/queries/types/market"
import { get_pt_out } from "@/lib/utils"
import useMarketStateData from "@/hooks/useMarketStateData.ts"
import useFetchObject from "@/hooks/useFetchObject.ts"
import { useQueryPriceVoucherWithCoinInfo } from "@/hooks/useQueryPriceVoucher.ts"

export function useCalculatePtYt(coinInfo?: CoinInfo) {
  const { data: marketState } = useMarketStateData(coinInfo?.marketStateId)
  const { mutateAsync: exchangeRateFun } = useFetchObject(
    coinInfo?.pyState,
    false,
  )
  const { mutateAsync: priceVoucherFun } = useQueryPriceVoucherWithCoinInfo(
    coinInfo,
    false,
  )

  return useQuery({
    queryKey: ["useCalculatePtYt", coinInfo?.marketStateId],
    queryFn: async () => {
      if (!coinInfo) {
        throw new Error("Please select a pool")
      }
      if (marketState === undefined) {
        throw new Error("not found market")
      }
      const exchangeRate = await exchangeRateFun({
        objectId: coinInfo.pyState,
        options: { showContent: true },
      })
      const priceVoucher = await priceVoucherFun()
      const baseAmount = new Decimal(1000).toString()
      const parsedData = JSON.parse(exchangeRate.toString())
      const ptOut = get_pt_out(
        Number(baseAmount),
        Number(parsedData?.content?.fields?.py_index_stored?.fields?.value),
        Number(priceVoucher.toString()),
      )
      const ptPrice = new Decimal(coinInfo.underlyingPrice).mul(1000).div(ptOut);
      const ytPrice = new Decimal(coinInfo.underlyingPrice).minus(ptPrice);
      const daysToExpiry = new Decimal(Number(coinInfo.maturity) - Date.now() / 1000).div(86400).toNumber();
      const ptApy = calculatePtAPY(coinInfo.underlyingPrice, Number(ptPrice), daysToExpiry);
      const yearsToExpiry = new Decimal(Number(coinInfo.maturity) - Date.now() / 1000).div(31536000).toNumber();
      const ytApy = calcuateYtAPY(coinInfo.underlyingApy, Number(ytPrice), yearsToExpiry);
      return {ptPrice, ytPrice, ptApy, ytApy }
    },
    enabled: !!coinInfo?.decimal && !!coinInfo?.marketStateId,
    refetchInterval: 20000,
  })
}

function calculatePtAPY(suiPrice: number, ptPrice: number, daysToExpiry: number): string {
    if (daysToExpiry <= 0) {
        return "0";
    }

    const ratio = new Decimal(suiPrice).div(ptPrice);
    const exponent = new Decimal(365).div(daysToExpiry);
    const apy = ratio.pow(exponent).minus(1);

    return apy.mul(100).toFixed(2);
}

function calcuateYtAPY(underlyingInterestApy: number, ytPrice: number, yearsToExpiry: number): string {
    if (yearsToExpiry <= 0) {
        return "0";
    }
    const underlyingInterestApyDecimal = new Decimal(underlyingInterestApy);
    const ytPriceDecimal = new Decimal(ytPrice);
    const yearsToExpiryDecimal = new Decimal(yearsToExpiry);

    const interestReturns = underlyingInterestApyDecimal.plus(1).pow(yearsToExpiryDecimal).minus(1);

    const rewardsReturns = new Decimal(0);

    const ytReturns = interestReturns.plus(rewardsReturns);

    const ytReturnsAfterFee = ytReturns.mul(0.97);

    const longYieldApy = ytReturnsAfterFee.div(ytPriceDecimal).pow(new Decimal(1).div(yearsToExpiryDecimal)).minus(1);

    return longYieldApy.mul(100).toFixed(2);
}
