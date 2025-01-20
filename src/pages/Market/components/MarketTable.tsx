import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CoinInfoWithMetrics } from "@/queries/types/market"
import { formatLargeNumber, formatTimeDiff } from "@/lib/utils"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"

interface MarketTableProps {
  list: CoinInfoWithMetrics[]
}

const MarketTable = ({ list }: MarketTableProps) => {
  const navigate = useNavigate()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="!px-0">Pool</TableHead>
          <TableHead className="text-center">Maturity</TableHead>
          <TableHead className="text-center">TVL</TableHead>
          <TableHead className="!px-2 text-right">Fixed APY</TableHead>
          <TableHead className="!px-2 text-right">Leveraged APY</TableHead>
          <TableHead className="!px-2 text-right">Pool APY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list?.map((item) => (
          <TableRow
            key={item.coinType + "_" + item.maturity}
            className="cursor-pointer"
            onClick={() =>
              navigate(`/market/detail/${item.coinType}/${item.maturity}`)
            }
          >
            <TableCell className="!px-0">
              <div className="flex items-center">
                <img
                  src={item.coinLogo}
                  alt={item.coinName}
                  className="size-8"
                />
                <div className="text-white ml-3">{item.coinName}</div>
                <div className="text-xs text-[#2DF4DD] px-2 py-1 bg-[#1B202A] rounded-[60px] ml-4">
                  {formatTimeDiff(parseInt(item.maturity))}
                </div>
              </div>
            </TableCell>
            <TableCell align="center">
              <div className="text-white">
                {dayjs(parseInt(item.maturity)).format("DD MMM YYYY")}
              </div>
            </TableCell>
            <TableCell className="!px-0" align="center">
              <div className="text-white">
                {item.tvl ? `$${formatLargeNumber(item.tvl, 6)}` : "--"}
              </div>
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-[#0F60FF] text-white rounded-xl px-4 py-2 flex items-center justify-between w-[192px] h-[52px]">
                <span>YT</span>
                <div className="flex flex-col items-end">
                  <span>
                    {item.ytApy
                      ? Number(item.ytApy) > 0
                        ? `+${formatLargeNumber(item.ytApy, 6)}%`
                        : `${formatLargeNumber(item.ytApy, 6)}%`
                      : "--"}
                  </span>
                  <span className="text-xs text-right">
                    ${item.ytPrice ? formatLargeNumber(item.ytPrice, 6) : "--"}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-[#2DF5DD] text-black rounded-xl px-4 py-2 w-[200px] h-[52px] flex items-center justify-between">
                <span>PT</span>
                <div className="flex flex-col items-end">
                  <span>
                    {item.ptApy ? `${formatLargeNumber(item.ptApy, 6)}%` : "--"}
                  </span>
                  <span className="text-xs">
                    ${item.ptPrice ? formatLargeNumber(item.ptPrice, 6) : "--"}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="!px-2" align="right">
              <div className="bg-[#62CAFF] text-black rounded-xl pl-4 pr-2 py-2 w-[200px] h-[52px] flex items-center justify-between">
                <span>Pool APY</span>
                <div className="flex flex-row items-center gap-1.5">
                  {item.poolApy
                    ? `${formatLargeNumber(item.poolApy, 6)}%`
                    : "--"}
                  <img src="/images/png/gift.png" alt="" className="size-4" />
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default MarketTable
