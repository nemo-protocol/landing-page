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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"

interface MarketTableProps {
  list: CoinInfoWithMetrics[]
}

const MarketTable = ({ list }: MarketTableProps) => {
  const navigate = useNavigate()

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="!px-0">Pool</TableHead>
            <TableHead className="text-center">Maturity</TableHead>
            <TableHead className="text-center">TVL</TableHead>
            <TableHead className="!px-2 text-center">Leveraged APY</TableHead>
            <TableHead className="!px-2 text-center">Fixed APY</TableHead>
            <TableHead className="!px-2 text-right">Pool APY</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list?.map((item) => (
            <TableRow key={item.coinType + "_" + item.maturity}>
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
              <TableCell className="!px-2" align="center">
                <div
                  className="bg-[#0F60FF] text-white rounded-xl px-4 py-2 flex items-center justify-between w-[192px] h-[52px] cursor-pointer border border-transparent hover:border-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(
                      `/market/detail/${item.coinType}/${item.maturity}/swap/yt`,
                    )
                  }}
                >
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
                      $
                      {item.ytPrice ? formatLargeNumber(item.ytPrice, 6) : "--"}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="!px-2" align="center">
                <div
                  className="bg-[#2DF5DD] text-black rounded-xl px-4 py-2 w-[200px] h-[52px] flex items-center justify-between cursor-pointer border border-transparent hover:border-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(
                      `/market/detail/${item.coinType}/${item.maturity}/swap/pt`,
                    )
                  }}
                >
                  <span>PT</span>
                  <div className="flex flex-col items-end">
                    <span>
                      {item.ptApy
                        ? `${formatLargeNumber(item.ptApy, 6)}%`
                        : "--"}
                    </span>
                    <span className="text-xs">
                      $
                      {item.ptPrice ? formatLargeNumber(item.ptPrice, 6) : "--"}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="!px-2" align="right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="bg-[#62CAFF] text-black rounded-xl pl-4 pr-2 py-2 w-[200px] h-[52px] flex items-center justify-between cursor-pointer border border-transparent hover:border-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(
                          `/market/detail/${item.coinType}/${item.maturity}/add`,
                        )
                      }}
                    >
                      <span>Pool APY</span>
                      <div className="flex flex-row items-center gap-1.5">
                        {item.poolApy
                          ? `${formatLargeNumber(item.poolApy, 6)}%`
                          : "--"}
                        <img
                          src="/images/market/gift.png"
                          alt=""
                          className="size-4"
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-[#1B202A] text-white border-none p-4 relative rounded-xl w-[312px]"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-row items-start justify-between">
                        <span className="text-sm text-left">Points</span>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-mono text-xs">
                            {item.perPoints
                              ? `${formatLargeNumber(item.perPoints, 6)}`
                              : "--"}
                          </span>
                          <span className="text-[#96A9E4] text-xs">
                            per LP per day
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-left">Scaled</div>
                        <div className="relative flex flex-row gap-2">
                          <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                          <div className="absolute -bottom-1 left-0 top-0 w-[1px] bg-[#41517A]"></div>
                          <div className="flex flex-1 flex-row items-start justify-between gap-4">
                            <div className="flex flex-row items-center gap-1.5">
                              <span className="text-[#96A9E4] text-xs">
                                PT APY
                              </span>
                            </div>
                            <span className="font-mono text-xs">
                              {item.scaled_pt_apy
                                ? `${formatLargeNumber(item.scaled_pt_apy, 6)}%`
                                : "--"}
                            </span>
                          </div>
                        </div>
                        <div className="relative flex flex-row gap-2">
                          <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                          <div className="flex flex-1 flex-row items-start justify-between gap-4">
                            <div className="flex flex-row items-center gap-1.5">
                              <span className="text-[#96A9E4] text-xs">
                                Underlying APY
                              </span>
                            </div>
                            <span className="font-mono text-xs">
                              {item.scaled_underlying_apy
                                ? `${formatLargeNumber(item.scaled_underlying_apy, 6)}%`
                                : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row items-start justify-between">
                        <span className="text-sm text-left">Fee APY</span>
                        <span className="font-mono text-xs">
                          {item.feeApy
                            ? `${formatLargeNumber(item.feeApy, 6)}%`
                            : "--"}
                        </span>
                      </div>
                      {item.incentiveApy && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm text-left">Incentive APY</div>
                          <div className="relative flex flex-row gap-2">
                            <div className="-mt-1 h-3 w-3 rounded-bl-md border-b border-l border-[#41517A]"></div>
                            <div className="flex flex-1 flex-row items-start justify-between gap-4">
                              <div className="flex flex-row items-center gap-1.5">
                                <span className="text-[#96A9E4] text-xs">
                                  Incentive
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={item.providerLogo}
                                  alt=""
                                  className="size-4"
                                />
                                <span className="font-mono text-xs">0%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <span className="text-[#2DF4DD] text-sm">
                          Total APY
                        </span>
                        <span className="text-[#2DF4DD] font-mono text-sm">
                          {item.poolApy
                            ? `${formatLargeNumber(item.poolApy, 6)}%`
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}

export default MarketTable
