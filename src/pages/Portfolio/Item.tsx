import dayjs from "dayjs"
import { useEffect, useMemo, useState } from "react"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import { Transaction } from "@mysten/sui/transactions"
import { PortfolioItem } from "@/queries/types/market"
import usePyPositionData from "@/hooks/usePyPositionData"
import { TableRow, TableCell } from "@/components/ui/table"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
// TODO: 封装全局的提示框
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { network } from "@/config"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import usePortfolio from "@/hooks/usePortfolio"
import { useWallet } from "@aricredemption/wallet-kit"
import { getPriceVoucher } from "@/lib/txHelper"

export default function Item({
  itemKey,
  name,
  icon,
  ytReward,
  lpReward,
  selectType,
  ...coinConfig
}: PortfolioItem & {
  selectType: "pt" | "yt" | "lp" | "all"
  itemKey: string
}) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const { updatePortfolio } = usePortfolio()
  const { address } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  const { data: lpMarketPositionData } = useLpMarketPositionData(
    address,
    coinConfig.marketStateId,
    coinConfig.maturity,
    coinConfig.marketPositionType,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig.pyStateId,
    coinConfig.maturity,
    coinConfig.pyPositionType,
  )

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(1e9)
        .toString()
    }
    return 0
  }, [pyPositionData])

  const lpCoinBalance = useMemo(() => {
    if (lpMarketPositionData?.length) {
      return lpMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [lpMarketPositionData])

  useEffect(() => {
    if (isConnected) {
      console.log("itemKey", itemKey)

      updatePortfolio(
        itemKey,
        new Decimal(ptBalance)
          .mul(
            coinConfig.ptPrice && coinConfig.ptPrice !== ""
              ? coinConfig.ptPrice
              : 0,
          )
          .add(
            new Decimal(ytBalance).mul(
              coinConfig.ytPrice && coinConfig.ytPrice !== ""
                ? coinConfig.ytPrice
                : 0,
            ),
          )
          .add(
            new Decimal(lpCoinBalance).mul(
              coinConfig.lpPrice && coinConfig.lpPrice !== ""
                ? coinConfig.lpPrice
                : 0,
            ),
          )
          .toNumber(),
        new Decimal(lpReward && lpReward !== "" ? lpReward : 0)
          .mul(coinConfig?.underlyingPrice ? coinConfig.underlyingPrice : 0)
          .toNumber(),
      )
    }
  }, [
    updatePortfolio,
    ptBalance,
    ytBalance,
    lpCoinBalance,
    lpReward,
    isConnected,
    itemKey,
    coinConfig.lpPrice,
    coinConfig.ptPrice,
    coinConfig.ytPrice,
    coinConfig.underlyingPrice,
  ])

  async function claim() {
    if (coinConfig?.coinType && address && ytBalance) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${coinConfig?.nemoContractId}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig?.version),
              tx.object(coinConfig?.pyStateId),
            ],
            typeArguments: [coinConfig?.syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        tx.moveCall({
          target: `${coinConfig?.nemoContractId}::yield_factory::redeem_due_interest`,
          arguments: [
            tx.pure.address(address),
            pyPosition,
            tx.object(coinConfig?.pyStateId),
            priceVoucher,
            tx.object(coinConfig?.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig?.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  async function redeemPT() {
    if (!ptBalance && coinConfig?.coinType && address) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${coinConfig?.nemoContractId}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig?.version),
              tx.object(coinConfig?.pyStateId),
            ],
            typeArguments: [coinConfig?.syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = tx.moveCall({
          target: `${coinConfig?.nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(coinConfig?.providerVersion),
            tx.object(coinConfig?.providerMarket),
            tx.object(coinConfig?.syStateId),
            tx.object("0x6"),
          ],
          typeArguments: [
            coinConfig?.syCoinType,
            coinConfig?.underlyingCoinType,
          ],
        })

        const [syCoin] = tx.moveCall({
          target: `${coinConfig?.nemoContractId}::market::swap_exact_pt_for_sy`,
          arguments: [
            tx.object(coinConfig?.version),
            tx.pure.u64(new Decimal(ptBalance).mul(1e9).toString()),
            pyPosition,
            tx.object(coinConfig?.pyStateId),
            priceVoucher,
            tx.object(coinConfig?.yieldFactoryConfigId),
            tx.object(coinConfig?.marketFactoryConfigId),
            tx.object(coinConfig?.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig?.syCoinType],
        })

        tx.transferObjects([syCoin], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  async function redeemLP() {
    if (
      address &&
      coinConfig?.coinType &&
      lpCoinBalance &&
      lpMarketPositionData?.length
    ) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${coinConfig?.nemoContractId}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig?.version),
              tx.object(coinConfig?.pyStateId),
            ],
            typeArguments: [coinConfig?.syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        tx.moveCall({
          target: `${coinConfig?.nemoContractId}::market::burn_lp`,
          arguments: [
            tx.object(coinConfig?.version),
            tx.pure.address(address),
            tx.pure.u64(new Decimal(lpCoinBalance).mul(1e9).toFixed(0)),
            pyPosition,
            tx.object(coinConfig?.marketStateId),
            tx.object(lpMarketPositionData[0].id.id),
          ],
          typeArguments: [coinConfig?.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  return (
    <>
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[#0e0f15] border-none rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-white">
              {status}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center">
              {status === "Success" ? <SuccessIcon /> : <FailIcon />}
              {status === "Success" && (
                <div className="py-2 flex flex-col items-center">
                  <p className=" text-white/50">Transaction submitted!</p>
                  <a
                    className="text-[#8FB5FF] underline"
                    href={`https://suiscan.xyz/${network}/tx/${txId}`}
                    target="_blank"
                  >
                    View details
                  </a>
                </div>
              )}
              {status === "Failed" && (
                <div className="py-2 flex flex-col items-center">
                  <p className=" text-red-400">Transaction Error</p>
                  <p className="text-red-500 break-all">{message}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-center">
            <button
              className="text-white w-36 rounded-3xl bg-[#0F60FF] py-1.5"
              onClick={() => setOpen(false)}
            >
              OK
            </button>
          </div>
          <AlertDialogFooter></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {["pt", "all"].includes(selectType) && (
        <TableRow className="cursor-pointer">
          <TableCell className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <img src={icon} alt="" className="size-6 sm:size-10" />
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span>PT {name}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(coinConfig?.maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center space-x-1">
            <span>
              {new Decimal(ptBalance).mul(coinConfig?.ptPrice).gt(0) && "≈"}
            </span>
            <span>
              ${new Decimal(ptBalance).mul(coinConfig?.ptPrice).toFixed(2)}
            </span>
          </TableCell>
          <TableCell className="text-center">{ptBalance}</TableCell>
          <TableCell align="center" className="text-white">
            {dayjs(parseInt(coinConfig?.maturity)).diff(dayjs(), "day") > 0 ? (
              <div className="flex md:flex-row flex-col items-center gap-2 justify-center">
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/swap/pt`}
                >
                  <button className="rounded-3xl bg-[#00B795] w-24 h-8 text-white">
                    Buy
                  </button>
                </Link>
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/sell/pt`}
                >
                  <button className="rounded-3xl bg-[#FF7474] w-24 h-8 text-white">
                    Sell
                  </button>
                </Link>
              </div>
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
                {dayjs(parseInt(coinConfig?.maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">YT</TableCell>
          <TableCell className="text-center space-x-1">
            <span>
              {new Decimal(ytBalance).mul(coinConfig?.ytPrice).gt(0) && "≈"}
            </span>
            <span>
              ${new Decimal(ytBalance).mul(coinConfig?.ytPrice).toFixed(2)}
            </span>
          </TableCell>
          <TableCell className="text-center">{ytBalance}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center gap-x-2 justify-center">
              <div className="flex flex-col items-center">
                <span className="text-white text-sm">
                  {ytReward} {coinConfig?.underlyingPrice}
                </span>
                <span className="text-white/50 text-xs">
                  $
                  {new Decimal(ytReward || 0)
                    .mul(coinConfig?.underlyingPrice || 0)
                    .toFixed(2)}
                </span>
              </div>
              <button
                className={[
                  "rounded-3xl py-1 px-2",
                  ytBalance
                    ? "bg-[#0F60FF]"
                    : "bg-[#0F60FF]/50 cursor-not-allowed",
                ].join(" ")}
                onClick={claim}
                disabled={!ytBalance}
              >
                Claim
              </button>
            </div>
          </TableCell>
          <TableCell align="center" className="text-white">
            <div className="flex md:flex-row flex-col items-center gap-2 justify-center">
              <Link
                to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/swap/yt`}
              >
                <button className="rounded-3xl bg-[#00B795] w-24 h-8 text-white">
                  Buy
                </button>
              </Link>
              <Link
                to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/sell/yt`}
              >
                <button className="rounded-3xl bg-[#FF7474] w-24 h-8 text-white">
                  Sell
                </button>
              </Link>
            </div>
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
                {dayjs(parseInt(coinConfig?.maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">LP</TableCell>
          <TableCell className="text-center space-x-1">
            <span>
              {new Decimal(lpCoinBalance).mul(coinConfig?.lpPrice).gt(0) && "≈"}
            </span>
            <span>
              ${new Decimal(lpCoinBalance).mul(coinConfig?.lpPrice).toFixed(2)}
            </span>
          </TableCell>
          <TableCell className="text-center">{lpCoinBalance}</TableCell>
          <TableCell align="center" className="text-white">
            {dayjs(parseInt(coinConfig?.maturity)).diff(dayjs(), "day") > 0 ? (
              <div className="flex md:flex-row flex-col items-center gap-2 justify-center">
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/liquidity/add`}
                >
                  <button className="rounded-3xl bg-[#0F60FF] h-8 w-24 text-white">
                    Add
                  </button>
                </Link>
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/liquidity/remove`}
                >
                  <button className="rounded-3xl bg-[#FF7474] h-8 w-24 text-white">
                    Remove
                  </button>
                </Link>
              </div>
            ) : (
              <button
                className="rounded-3xl bg-[#0F60FF] h-8 w-24"
                onClick={() => {
                  if (selectType === "lp") {
                    redeemLP()
                  } else if (selectType === "pt") {
                    redeemPT()
                  }
                }}
              >
                Redeem
              </button>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
