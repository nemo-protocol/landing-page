import dayjs from "dayjs"
import { useMemo } from "react"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import { PackageAddress } from "@/contract"
import { TableRow, TableCell } from "@/components/ui/table"
import { useCurrentWallet, useSuiClientQuery } from "@mysten/dapp-kit"

export default function Item({
  name = "sSUI",
  ptPrice = "0.12",
  lpPrice = "0.18",
  ytPrice = "0.02",
  date = "1730390400000",
  icon = "https://nemoprotocol.com/static/sui.svg",
  coinType = "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI",
}: {
  name: string
  icon: string
  date: string
  ptPrice: string
  ytPrice: string
  lpPrice: string
  coinType: string
}) {
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
      enabled: !!address,
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
      enabled: !!address,
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
      enabled: !!address && !!coinType,
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
      <TableRow className="cursor-pointer">
        <TableCell className="flex items-center gap-x-3">
          <img src={icon} alt="" className="size-10" />
          <div className="flex items-center gap-x-1">
            <span>{name} PT</span>
            <span className="text-white/50 text-xs">
              {dayjs(date).format("MMM DD YYYY")}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center">PT</TableCell>
        <TableCell className="text-center">
          ${new Decimal(ptBalance).div(ptPrice).toFixed(2)}
        </TableCell>
        <TableCell className="text-center">{ptBalance}</TableCell>
        {/* <TableCell className="text-center">$523.08</TableCell> */}
        <TableCell align="center" className="space-x-2 text-white">
          <Link to={`/market/detail/${coinType}/swap/buy/pt`}>
            <button className="rounded-3xl bg-[#00B795] w-24">Buy</button>
          </Link>
          <Link to={`/market/detail/${coinType}/swap/sell/pt`}>
            <button className="rounded-3xl bg-[#FF7474] w-24">Sell</button>
          </Link>
        </TableCell>
      </TableRow>
      <TableRow className="cursor-pointer">
        <TableCell className="flex items-center gap-x-3">
          <img src={icon} alt="" className="size-10" />
          <div className="flex items-center gap-x-1">
            <span>{name} YT</span>
            <span className="text-white/50 text-xs">
              {dayjs(date).format("MMM DD YYYY")}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center">YT</TableCell>
        <TableCell className="text-center">
          ${new Decimal(ytBalance).div(ytPrice).toFixed(2)}
        </TableCell>
        <TableCell className="text-center">{ytBalance}</TableCell>
        {/* <TableCell className="text-center">$523.08</TableCell> */}
        <TableCell align="center" className="space-x-2 text-white">
          <Link to={`/market/detail/${coinType}/swap/buy/yt`}>
            <button className="rounded-3xl bg-[#00B795] w-24">Buy</button>
          </Link>
          <Link to={`/market/detail/${coinType}/swap/sell/yt`}>
            <button className="rounded-3xl bg-[#FF7474] w-24">Sell</button>
          </Link>
        </TableCell>
      </TableRow>
      <TableRow className="cursor-pointer">
        <TableCell className="flex items-center gap-x-3">
          <img src={icon} alt="" className="size-10" />
          <div className="flex items-center gap-x-1">
            <span>{name} LP</span>
            <span className="text-white/50 text-xs">
              {dayjs(date).format("MMM DD YYYY")}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center">LP</TableCell>
        <TableCell className="text-center">
          ${new Decimal(lpBalance).div(lpPrice).toFixed(2)}
        </TableCell>
        <TableCell className="text-center">{lpBalance}</TableCell>
        {/* <TableCell className="text-center">$523.08</TableCell> */}
        <TableCell align="center" className="space-x-2 text-white">
          <Link to={`/market/detail/${coinType}/liquidity/add`}>
            <button className="rounded-3xl bg-[#0F60FF] w-24">Add</button>
          </Link>
          <Link to={`/market/detail/${coinType}/liquidity/remove`}>
            <button className="rounded-3xl bg-[#FF7474] w-24">Remove</button>
          </Link>
        </TableCell>
      </TableRow>
    </>
  )
}
