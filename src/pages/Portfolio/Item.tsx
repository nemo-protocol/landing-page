import dayjs from "dayjs"
import { useMemo } from "react"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import { PackageAddress } from "@/contract"
import { TableRow, TableCell } from "@/components/ui/table"
import { useCurrentWallet, useSuiClientQuery } from "@mysten/dapp-kit"
import { PortfolioItem } from "@/queries/types/market"

export default function Item({
  name,
  ptPrice,
  lpPrice,
  ytPrice,
  maturity,
  icon,
  coinType,
  ytReward,
  rewardCoinType,
  rewardCoinPrice,
  selectType,
}: PortfolioItem & { selectType: "pt" | "yt" | "lp" | "all" }) {
  const { currentWallet } = useCurrentWallet()

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: ptData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::pt::PTCoin<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address && !!coinType && ["pt", "all"].includes(selectType),
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const { data: ytData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::yt::YTCoin<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address && !!coinType && ["yt", "all"].includes(selectType),
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const { data: lpCoinData } = useSuiClientQuery(
    "getCoins",
    {
      owner: address!,
      coinType: `${PackageAddress}::market::MarketLP<${coinType!}>`,
    },
    {
      gcTime: 10000,
      enabled: !!address && !!coinType && ["lp", "all"].includes(selectType),
      select: (data) => {
        return data.data.sort((a, b) =>
          new Decimal(b.balance).comparedTo(new Decimal(a.balance)),
        )
      },
    },
  )

  const ptBalance = useMemo(() => {
    if (ptData?.length) {
      return ptData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [ptData])

  const ytBalance = useMemo(() => {
    if (ytData?.length) {
      return ytData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [ytData])

  const lpBalance = useMemo(() => {
    if (lpCoinData?.length) {
      return lpCoinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [lpCoinData])

  return (
    <>
      {["pt", "all"].includes(selectType) && (
        <TableRow className="cursor-pointer">
          <TableCell className="flex items-center gap-x-3">
            <img src={icon} alt="" className="size-10" />
            <div className="flex items-center gap-x-2">
              <span>PT {name}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center">
            ${new Decimal(ptBalance).mul(ptPrice).toFixed(2)}
          </TableCell>
          <TableCell className="text-center">{ptBalance}</TableCell>
          <TableCell align="center" className="space-x-2 text-white">
            {dayjs(parseInt(maturity)).diff(dayjs(), "day") > 0 ? (
              <>
                <Link to={`/market/detail/${coinType}/${maturity}/swap/buy/pt`}>
                  <button className="rounded-3xl bg-[#00B795] w-24">Buy</button>
                </Link>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/swap/sell/pt`}
                >
                  <button className="rounded-3xl bg-[#FF7474] w-24">
                    Sell
                  </button>
                </Link>
              </>
            ) : (
              <button className="rounded-3xl bg-[#0F60FF] w-24">Redeem</button>
            )}
          </TableCell>
        </TableRow>
      )}
      {["yt", "all"].includes(selectType) && (
        <TableRow className="cursor-pointer">
          <TableCell className="flex items-center gap-x-3">
            <img src={icon} alt="" className="size-10" />
            <div className="flex items-center gap-x-1">
              <span>YT {name}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">YT</TableCell>
          <TableCell className="text-center">
            ${new Decimal(ytBalance).mul(ytPrice).toFixed(2)}
          </TableCell>
          <TableCell className="text-center">{ytBalance}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center gap-x-2 justify-center">
              <div className="flex flex-col items-center">
                <span className="text-white text-sm">
                  {ytReward} {rewardCoinType}
                </span>
                <span className="text-white/50 text-xs">
                  $
                  {new Decimal(ytReward || 0)
                    .mul(rewardCoinPrice || 0)
                    .toFixed(2)}
                </span>
              </div>
              <button className="rounded-3xl bg-[#0F60FF] py-1 px-2">
                Claim
              </button>
            </div>
          </TableCell>
          <TableCell align="center" className="space-x-2 text-white">
            <Link to={`/market/detail/${coinType}/${maturity}/swap/buy/yt`}>
              <button className="rounded-3xl bg-[#00B795] w-24">Buy</button>
            </Link>
            <Link to={`/market/detail/${coinType}/${maturity}/swap/sell/yt`}>
              <button className="rounded-3xl bg-[#FF7474] w-24">Sell</button>
            </Link>
          </TableCell>
        </TableRow>
      )}
      {["lp", "all"].includes(selectType) && (
        <TableRow className="cursor-pointer">
          <TableCell className="flex items-center gap-x-3">
            <img src={icon} alt="" className="size-10" />
            <div className="flex items-center gap-x-1">
              <span>LP {name}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">LP</TableCell>
          <TableCell className="text-center">
            ${new Decimal(lpBalance).mul(lpPrice).toFixed(2)}
          </TableCell>
          <TableCell className="text-center">{lpBalance}</TableCell>
          <TableCell align="center" className="space-x-2 text-white">
            {dayjs(parseInt(maturity)).diff(dayjs(), "day") > 0 ? (
              <>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/liquidity/add`}
                >
                  <button className="rounded-3xl bg-[#0F60FF] w-24">Add</button>
                </Link>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/liquidity/remove`}
                >
                  <button className="rounded-3xl bg-[#FF7474] w-24">
                    Remove
                  </button>
                </Link>
              </>
            ) : (
              <button className="rounded-3xl bg-[#0F60FF] w-24">Redeem</button>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
