import dayjs from "dayjs"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import Loading from "@/components/Loading"
import usePortfolio from "@/hooks/usePortfolio"
import { Skeleton } from "@/components/ui/skeleton"
import { network, debugLog, DEBUG } from "@/config"
import { useEffect, useMemo, useState } from "react"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useRedeemLp from "@/hooks/actions/useRedeemLp"
import { Transaction } from "@mysten/sui/transactions"
import { PortfolioItem } from "@/queries/types/market"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import { TableRow, TableCell } from "@/components/ui/table"
import { formatDecimalValue, isValidAmount } from "@/lib/utils"
import { PyPosition, MarketState, LpPosition } from "@/hooks/types"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import {
  redeemPy,
  burnSCoin,
  redeemSyCoin,
  getPriceVoucher,
} from "@/lib/txHelper"
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

const LoadingButton = ({
  loading,
  disabled,
  onClick,
  loadingText,
  buttonText,
}: {
  loading: boolean
  disabled: boolean
  onClick: () => void
  loadingText: string
  buttonText: string
}) => (
  <button
    className={[
      "rounded-3xl h-8",
      loading ? "bg-transparent w-32" : "w-24",
      !loading &&
        (disabled ? "bg-[#0F60FF]/50 cursor-not-allowed" : "bg-[#0F60FF]"),
    ].join(" ")}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? (
      <div className="flex items-center justify-center gap-1">
        <Loading className="h-4 w-4 border-b border-white" />
        <span className="text-sm whitespace-nowrap">{loadingText}</span>
      </div>
    ) : (
      buttonText
    )}
  </button>
)

export default function Item({
  name,
  icon,
  ytReward,
  lpReward,
  selectType,
  ptBalance,
  ytBalance,
  pyPositions,
  lpBalance,
  lpPositions,
  marketState,
  ...coinConfig
}: PortfolioItem & {
  ptBalance: string
  ytBalance: string
  lpBalance: string
  pyPositions: PyPosition[]
  lpPositions: LpPosition[]
  marketState?: MarketState
  selectType: "pt" | "yt" | "lp" | "all"
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

  const [loading, setLoading] = useState(false)

  const { mutateAsync: redeemLp } = useRedeemLp(coinConfig)

  const { data: ptYtData, isLoading: isPtYtLoading } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

  useEffect(() => {
    if (isConnected) {
      updatePortfolio(
        coinConfig.id,
        new Decimal(ptBalance)
          .mul(
            ptYtData?.ptPrice && new Decimal(ptYtData.ptPrice).gt(0)
              ? ptYtData.ptPrice
              : 0,
          )
          .add(
            new Decimal(ytBalance).mul(
              ptYtData?.ytPrice && new Decimal(ptYtData.ytPrice).gt(0)
                ? ptYtData.ytPrice
                : 0,
            ),
          )
          .add(
            new Decimal(lpBalance).mul(
              coinConfig.coinPrice &&
                ptYtData?.ptPrice &&
                new Decimal(coinConfig.coinPrice).add(ptYtData.ptPrice).gt(0)
                ? new Decimal(coinConfig.coinPrice)
                    .add(ptYtData.ptPrice)
                    .toNumber()
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
    coinConfig.id,
    lpReward,
    ptBalance,
    ytBalance,
    isConnected,
    lpBalance,
    updatePortfolio,
    ptYtData?.ptPrice,
    ptYtData?.ytPrice,
    coinConfig.coinPrice,
    coinConfig.underlyingPrice,
  ])

  async function claim() {
    if (coinConfig?.coinType && address && ytBalance) {
      try {
        setLoading(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositions?.length) {
          created = true
          const moveCall = {
            target: `${coinConfig?.nemoContractId}::py::init_py_position`,
            arguments: [coinConfig?.version, coinConfig?.pyStateId],
            typeArguments: [coinConfig?.syCoinType],
          }
          debugLog("init_py_position move call:", moveCall)

          pyPosition = tx.moveCall({
            ...moveCall,
            arguments: moveCall.arguments.map((arg) => tx.object(arg)),
          })[0]
        } else {
          pyPosition = tx.object(pyPositions[0].id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const redeemMoveCall = {
          target: `${coinConfig?.nemoContractId}::yield_factory::redeem_due_interest`,
          arguments: [
            address,
            "pyPosition",
            coinConfig?.pyStateId,
            "priceVoucher",
            coinConfig?.yieldFactoryConfigId,
            "0x6",
          ],
          typeArguments: [coinConfig?.syCoinType],
        }
        debugLog("redeem_due_interest move call:", redeemMoveCall)

        const [syCoin] = tx.moveCall({
          ...redeemMoveCall,
          arguments: [
            tx.object(coinConfig.version),
            pyPosition,
            tx.object(coinConfig?.pyStateId),
            priceVoucher,
            tx.object(coinConfig?.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
        })

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

        tx.transferObjects([yieldToken], address)

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
        // await refreshData()
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setLoading(false)
      }
    }
  }

  async function redeemPY() {
    if (coinConfig?.coinType && address && isValidAmount(ptBalance)) {
      try {
        setLoading(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositions?.length) {
          created = true
          const moveCall = {
            target: `${coinConfig?.nemoContractId}::py::init_py_position`,
            arguments: [coinConfig?.version, coinConfig?.pyStateId],
            typeArguments: [coinConfig?.syCoinType],
          }
          debugLog("init_py_position move call:", moveCall)

          pyPosition = tx.moveCall({
            ...moveCall,
            arguments: moveCall.arguments.map((arg) => tx.object(arg)),
          })[0]
        } else {
          pyPosition = tx.object(pyPositions[0].id)
        }
        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const syCoin = redeemPy(
          tx,
          coinConfig,
          "0",
          ptBalance.toString(),
          priceVoucher,
          pyPosition,
        )

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)

        tx.transferObjects([underlyingCoin], address)

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
        // await refreshData()
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setLoading(false)
      }
    }
  }

  async function redeemLP() {
    if (
      address &&
      lpBalance &&
      coinConfig?.coinType &&
      pyPositions?.length &&
      lpPositions?.length
    ) {
      try {
        setLoading(true)
        const { digest } = await redeemLp({
          lpAmount: lpBalance,
          coinConfig,
          lpPositions,
          pyPositions,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
        // await refreshData()
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setLoading(false)
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
              {status === "Success" ? (
                <img
                  src="/images/svg/success.svg"
                  alt="success"
                  className="size-10"
                />
              ) : (
                <img
                  src="/images/svg/fail.svg"
                  alt="fail"
                  className="size-10"
                />
              )}
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
            <div>
              <div>
                {isPtYtLoading ? (
                  <Skeleton className="h-6 w-20 mx-auto" />
                ) : (
                  <>
                    <span>
                      {ptYtData?.ptPrice &&
                        new Decimal(ptBalance)
                          .mul(new Decimal(ptYtData.ptPrice))
                          .gt(0) &&
                        "≈"}
                    </span>
                    <span>
                      $
                      {ptYtData?.ptPrice
                        ? formatDecimalValue(
                            new Decimal(ptBalance).mul(
                              new Decimal(ptYtData.ptPrice),
                            ),
                            Number(coinConfig?.decimal),
                          )
                        : "0.00"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="text-center">{ptBalance}</TableCell>
          <TableCell align="center" className="text-white">
            {Number(coinConfig?.maturity || Infinity) > Date.now() ? (
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
              <LoadingButton
                loading={loading}
                disabled={!ptBalance || ptBalance === "0"}
                onClick={redeemPY}
                loadingText="Redeeming"
                buttonText="Redeem"
              />
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
            {isPtYtLoading ? (
              <Skeleton className="h-6 w-20 mx-auto" />
            ) : (
              <>
                <span>
                  {ptYtData?.ytPrice &&
                    new Decimal(ytBalance)
                      .mul(new Decimal(ptYtData.ytPrice))
                      .gt(0) &&
                    "≈"}
                </span>
                <span>
                  $
                  {formatDecimalValue(
                    ptYtData?.ytPrice
                      ? new Decimal(ytBalance).mul(
                          new Decimal(ptYtData.ytPrice),
                        )
                      : new Decimal(0),
                    Number(coinConfig?.decimal),
                  )}
                </span>
              </>
            )}
          </TableCell>
          <TableCell className="text-center">{ytBalance}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center gap-x-2 justify-center">
              <div className="flex flex-col items-center w-24">
                <span className="text-white text-sm break-all">
                  {ytReward || 0}
                </span>
                <span className="text-white/50 text-xs">
                  {ytReward
                    ? `$${formatDecimalValue(
                        new Decimal(ytReward).mul(
                          Number(coinConfig?.underlyingPrice),
                        ),
                        Number(coinConfig?.decimal),
                      )}`
                    : "$0"}
                </span>
              </div>
              <LoadingButton
                onClick={claim}
                loading={loading}
                buttonText="Claim"
                loadingText="Claiming"
                disabled={!isValidAmount(ytBalance)}
              />
            </div>
          </TableCell>
          <TableCell align="center" className="text-white">
            {Number(coinConfig?.maturity || Infinity) > Date.now() ? (
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
            ) : (
              <span className="text-white/50">Expired</span>
            )}
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
            {isPtYtLoading ? (
              <Skeleton className="h-6 w-20 mx-auto" />
            ) : (
              <>
                <span>
                  {ptYtData?.tvl &&
                    new Decimal(lpBalance).mul(ptYtData.tvl).gt(0) &&
                    "≈"}
                </span>
                <span>
                  $
                  {formatDecimalValue(
                    ptYtData?.tvl
                      ? new Decimal(lpBalance).mul(ptYtData.tvl)
                      : new Decimal(0),
                    2,
                  )}
                </span>
              </>
            )}
          </TableCell>
          <TableCell className="text-center">{lpBalance}</TableCell>
          <TableCell align="center" className="text-white">
            {Number(coinConfig?.maturity || Infinity) > Date.now() ? (
              <div className="flex md:flex-row flex-col items-center gap-2 justify-center">
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/add`}
                >
                  <button className="rounded-3xl bg-[#0F60FF] h-8 w-24 text-white">
                    Add
                  </button>
                </Link>
                <Link
                  to={`/market/detail/${coinConfig?.coinType}/${coinConfig?.maturity}/remove`}
                >
                  <button className="rounded-3xl bg-[#FF7474] h-8 w-24 text-white">
                    Remove
                  </button>
                </Link>
              </div>
            ) : (
              <LoadingButton
                loading={loading}
                disabled={!lpBalance || lpBalance === "0"}
                onClick={redeemLP}
                loadingText="Redeeming"
                buttonText="Redeem"
              />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
