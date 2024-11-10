import dayjs from "dayjs"
import { useMemo, useState } from "react"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import { useCurrentWallet } from "@mysten/dapp-kit"
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
  pyStateId,
  marketStateId,
  pyPositionType,
  marketPositionType,
  nemoContractId,
  version,
  syCoinType,
  providerMarket,
  providerVersion,
  syStateId,
  underlyingCoinType,
  yieldFactoryConfigId,
  marketFactoryConfigId,
}: PortfolioItem & { selectType: "pt" | "yt" | "lp" | "all" }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { currentWallet } = useCurrentWallet()
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: lppMarketPositionData } = useLpMarketPositionData(
    address,
    marketStateId,
    maturity,
    marketPositionType,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    pyStateId,
    maturity,
    pyPositionType,
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
    if (lppMarketPositionData?.length) {
      return lppMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [lppMarketPositionData])

  async function claim() {
    if (coinType && address) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${nemoContractId}::py::init_py_position`,
            arguments: [tx.object(version), tx.object(pyStateId)],
            typeArguments: [syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = tx.moveCall({
          target: `${nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(providerVersion),
            tx.object(providerMarket),
            tx.object(syStateId),
            tx.object("0x6"),
          ],
          typeArguments: [syCoinType, underlyingCoinType],
        })

        tx.moveCall({
          target: `${nemoContractId}::yield_factory::redeem_due_interest`,
          arguments: [
            tx.pure.address(address),
            pyPosition,
            tx.object(pyStateId),
            priceVoucher,
            tx.object(yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
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
    if (!ptBalance && coinType && address) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${nemoContractId}::py::init_py_position`,
            arguments: [tx.object(version), tx.object(pyStateId)],
            typeArguments: [syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = tx.moveCall({
          target: `${nemoContractId}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(providerVersion),
            tx.object(providerMarket),
            tx.object(syStateId),
            tx.object("0x6"),
          ],
          typeArguments: [syCoinType, underlyingCoinType],
        })

        const [syCoin] = tx.moveCall({
          target: `${nemoContractId}::market::swap_exact_pt_for_sy`,
          arguments: [
            tx.object(version),
            tx.pure.u64(new Decimal(ptBalance).mul(1e9).toString()),
            pyPosition,
            tx.object(pyStateId),
            priceVoucher,
            tx.object(yieldFactoryConfigId),
            tx.object(marketFactoryConfigId),
            tx.object(marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [syCoinType],
        })

        tx.transferObjects([syCoin], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
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
    if (address && coinType && lpCoinBalance && lppMarketPositionData?.length) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${nemoContractId}::py::init_py_position`,
            arguments: [tx.object(version), tx.object(pyStateId)],
            typeArguments: [syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        tx.moveCall({
          target: `${nemoContractId}::market::burn_lp`,
          arguments: [
            tx.object(version),
            tx.pure.address(address),
            tx.pure.u64(new Decimal(lpCoinBalance).mul(1e9).toFixed(0)),
            pyPosition,
            tx.object(marketStateId),
            tx.object(lppMarketPositionData[0].id.id),
          ],
          typeArguments: [syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
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
                  <button className="rounded-3xl bg-[#00B795] w-24 h-8 text-white">
                    Buy
                  </button>
                </Link>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/swap/sell/pt`}
                >
                  <button className="rounded-3xl bg-[#FF7474] w-24 h-8 text-white">
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
              <button
                className="rounded-3xl bg-[#0F60FF] py-1 px-2"
                onClick={claim}
              >
                Claim
              </button>
            </div>
          </TableCell>
          <TableCell align="center" className="space-x-2 text-white">
            <Link to={`/market/detail/${coinType}/${maturity}/swap/buy/yt`}>
              <button className="rounded-3xl bg-[#00B795] w-24 h-8 text-white">
                Buy
              </button>
            </Link>
            <Link to={`/market/detail/${coinType}/${maturity}/swap/sell/yt`}>
              <button className="rounded-3xl bg-[#FF7474] w-24 h-8 text-white">
                Sell
              </button>
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
            ${new Decimal(lpCoinBalance).mul(lpPrice).toFixed(2)}
          </TableCell>
          <TableCell className="text-center">{lpCoinBalance}</TableCell>
          <TableCell align="center" className="space-x-2 text-white">
            {dayjs(parseInt(maturity)).diff(dayjs(), "day") > 0 ? (
              <>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/liquidity/add`}
                >
                  <button className="rounded-3xl bg-[#0F60FF] h-8 w-24 text-white">
                    Add
                  </button>
                </Link>
                <Link
                  to={`/market/detail/${coinType}/${maturity}/liquidity/remove`}
                >
                  <button className="rounded-3xl bg-[#FF7474] h-8 w-24 text-white">
                    Remove
                  </button>
                </Link>
              </>
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
