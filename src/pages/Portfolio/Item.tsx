import dayjs from "dayjs"
import Decimal from "decimal.js"
import { Link } from "react-router-dom"
import Loading from "@/components/Loading"
import { network, debugLog } from "@/config"
import usePortfolio from "@/hooks/usePortfolio"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useMemo, useState } from "react"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useRedeemLp from "@/hooks/actions/useRedeemLp"
import { Transaction } from "@mysten/sui/transactions"
import { PortfolioItem } from "@/queries/types/market"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import SmallNumDisplay from "@/components/SmallNumDisplay"
import { TableRow, TableCell } from "@/components/ui/table"
import { formatDecimalValue, isValidAmount } from "@/lib/utils"
import useQueryClaimYtReward from "@/hooks/useQueryClaimYtReward"
import { PyPosition, MarketState, LpPosition } from "@/hooks/types"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import {
  redeemPy,
  burnSCoin,
  redeemSyCoin,
  getPriceVoucher,
  initPyPosition,
} from "@/lib/txHelper"
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import RefreshButton from "@/components/RefreshButton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useQueryClaimLpReward from "@/hooks/useQueryClaimLpReward"
import useClaimLpReward from "@/hooks/actions/useClaimLpReward"

interface LoadingButtonProps {
  loading: boolean
  disabled: boolean
  buttonText: string | JSX.Element
  loadingText: string
  onClick: () => void
}

const LoadingButton = ({
  onClick,
  loading,
  disabled,
  buttonText,
  loadingText,
}: LoadingButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={[
      "rounded-3xl h-8",
      loading ? "bg-transparent w-32" : "w-24",
      !loading &&
        (disabled ? "bg-[#0F60FF]/50 cursor-not-allowed" : "bg-[#0F60FF]"),
    ].join(" ")}
  >
    {loading ? (
      <div className="flex items-center justify-center gap-2.5">
        <Loading className="h-4 w-4" />
        <span className="text-sm whitespace-nowrap">{loadingText}</span>
      </div>
    ) : (
      buttonText
    )}
  </button>
)

export default function Item({
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
  const [ytClaimed, setYtClaimed] = useState(false)
  const [ptRedeemed, setPtRedeemed] = useState(false)
  const [lpRedeemed, setLpRedeemed] = useState(false)
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const { address } = useWallet()
  const { updatePortfolio } = usePortfolio()
  const isConnected = useMemo(() => !!address, [address])

  const [redeemLoading, setRedeemLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)

  const { mutateAsync: redeemLp } = useRedeemLp(coinConfig, marketState)

  // TODO: yt price optimization
  const { data: ptYtData, isLoading: isPtYtLoading } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

  const {
    data: ytReward,
    isLoading: isClaimLoading,
    refetch: refetchYtReward,
  } = useQueryClaimYtReward(coinConfig, {
    ytBalance,
    pyPositions,
    tokenType: selectType === "yt" ? 1 : 0,
  })

  const [selectedRewardIndex, setSelectedRewardIndex] = useState(0)

  const {
    data: lpReward,
    isLoading: isLpRewardLoading,
    refetch: refetchLpReward,
  } = useQueryClaimLpReward(coinConfig, {
    lpBalance,
    lpPositions,
    marketState,
    rewardIndex: selectedRewardIndex,
  })

  const { mutateAsync: claimLpRewardMutation } = useClaimLpReward(coinConfig)

  useEffect(() => {
    if (isConnected) {
      updatePortfolio(
        coinConfig.id,
        new Decimal(ptBalance || 0)
          .mul(
            ptYtData?.ptPrice && isValidAmount(ptYtData?.ptPrice)
              ? ptYtData.ptPrice
              : 0,
          )
          .add(
            new Decimal(ytBalance || 0).mul(
              ptYtData?.ytPrice && isValidAmount(ptYtData?.ytPrice)
                ? ptYtData.ytPrice
                : 0,
            ),
          )
          .add(
            new Decimal(lpBalance || 0).mul(
              ptYtData?.lpPrice && isValidAmount(ptYtData?.lpPrice)
                ? ptYtData.lpPrice
                : 0,
            ),
          )
          .toNumber(),
        new Decimal(ytReward && isValidAmount(ytReward) ? ytReward : "0")
          .mul(coinConfig?.underlyingPrice ?? 0)
          .toNumber(),
      )
    }
  }, [
    ytReward,
    ptBalance,
    ytBalance,
    lpBalance,
    isConnected,
    coinConfig.id,
    updatePortfolio,
    ptYtData?.ptPrice,
    ptYtData?.lpPrice,
    ptYtData?.ytPrice,
    coinConfig.coinPrice,
    coinConfig.underlyingPrice,
  ])

  async function claim() {
    if (coinConfig?.coinType && address && ytBalance) {
      try {
        setClaimLoading(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositions?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
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
        const underlyingCoin = burnSCoin(tx, coinConfig, yieldToken)
        tx.transferObjects([underlyingCoin], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
        if (Number(coinConfig?.maturity || Infinity) <= Date.now()) {
          setYtClaimed(true)
        }
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setClaimLoading(false)
      }
    }
  }

  async function redeemPY() {
    if (coinConfig?.coinType && address && isValidAmount(ptBalance)) {
      try {
        setRedeemLoading(true)
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
        setPtRedeemed(true)
        // await refreshData()
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setRedeemLoading(false)
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
        setRedeemLoading(true)
        const { digest } = await redeemLp({
          lpAmount: lpBalance,
          coinConfig,
          lpPositions,
          pyPositions,
        })
        setTxId(digest)
        setOpen(true)
        setStatus("Success")
        setLpRedeemed(true)
        // await refreshData()
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setRedeemLoading(false)
      }
    }
  }

  async function claimLpReward(rewardIndex: number = selectedRewardIndex) {
    debugLog("claimLpReward", lpPositions, marketState)
    if (
      coinConfig?.coinType &&
      address &&
      lpBalance &&
      lpPositions?.length &&
      marketState?.rewardMetrics?.[rewardIndex]
    ) {
      try {
        setClaimLoading(true)
        const tx = new Transaction()

        await claimLpRewardMutation({
          tx,
          coinConfig,
          lpPositions,
          rewardMetric: marketState.rewardMetrics[rewardIndex],
        })

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
        })

        setTxId(digest)
        setOpen(true)
        setStatus("Success")
        // Refresh LP reward data after successful claim
        await refetchLpReward()
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      } finally {
        setClaimLoading(false)
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
      {["pt", "all"].includes(selectType) && !ptRedeemed && (
        <TableRow className="cursor-pointer">
          <TableCell className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <img
              src={coinConfig.underlyingCoinLogo}
              alt=""
              className="size-6 sm:size-10"
            />
            <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap">
              <span>PT {coinConfig.coinName}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(coinConfig?.maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center">PT</TableCell>
          <TableCell className="text-center space-x-1">
            {isPtYtLoading ? (
              <Skeleton className="h-6 w-24 mx-auto" />
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
                  <SmallNumDisplay
                    value={formatDecimalValue(
                      ptYtData?.ptPrice
                        ? new Decimal(ptBalance).mul(
                            new Decimal(ptYtData.ptPrice),
                          )
                        : "0",
                      Number(coinConfig?.decimal),
                    )}
                  />
                </span>
              </>
            )}
          </TableCell>
          <TableCell className="text-center">
            {isPtYtLoading ? (
              <Skeleton className="h-6 w-24 mx-auto" />
            ) : (
              <SmallNumDisplay value={ptBalance} />
            )}
          </TableCell>
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
                loading={redeemLoading}
                disabled={!ptBalance || ptBalance === "0"}
                onClick={redeemPY}
                loadingText="Redeeming"
                buttonText="Redeem"
              />
            )}
          </TableCell>
        </TableRow>
      )}
      {["yt", "all"].includes(selectType) &&
        !ytClaimed &&
        (Number(coinConfig?.maturity || Infinity) > Date.now() ||
          isValidAmount(ytReward) ||
          isValidAmount(ptYtData?.ytPrice)) && (
          <TableRow className="cursor-pointer">
            <TableCell className="flex items-center gap-x-3">
              <img
                src={coinConfig.underlyingCoinLogo}
                alt=""
                className="size-10"
              />
              <div className="flex items-center gap-x-1 flex-wrap">
                <span>YT {coinConfig.coinName}</span>
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
                    <SmallNumDisplay
                      value={formatDecimalValue(
                        ptYtData?.ytPrice
                          ? new Decimal(ytBalance).mul(
                              new Decimal(ptYtData.ytPrice),
                            )
                          : "0",
                        Number(coinConfig?.decimal),
                      )}
                    />
                  </span>
                </>
              )}
            </TableCell>
            <TableCell className="text-center md:px-6">
              <SmallNumDisplay value={ytBalance} />
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center gap-x-2">
                {isClaimLoading ? (
                  <div className="flex items-center gap-x-2">
                    <div className="flex flex-col items-center w-24">
                      <Skeleton className="h-5 w-16 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-3xl" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-white text-sm break-all flex items-center gap-x-1">
                        <SmallNumDisplay value={ytReward || 0} />
                        <RefreshButton onRefresh={refetchYtReward} />
                      </span>
                      <span className="text-white/50 text-xs">
                        $
                        <SmallNumDisplay
                          value={
                            ytReward
                              ? formatDecimalValue(
                                  new Decimal(ytReward).mul(
                                    Number(coinConfig?.underlyingPrice),
                                  ),
                                  Number(coinConfig?.decimal),
                                )
                              : "0"
                          }
                        />
                      </span>
                    </div>
                    <LoadingButton
                      onClick={claim}
                      loading={claimLoading}
                      buttonText="Claim"
                      loadingText="Claiming"
                      disabled={!isValidAmount(ytBalance)}
                    />
                  </>
                )}
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
      {["lp", "all"].includes(selectType) && !lpRedeemed && (
        <TableRow className="cursor-pointer">
          {/* Assets */}
          <TableCell className="flex items-center gap-x-3">
            <img
              src={coinConfig.underlyingCoinLogo}
              alt=""
              className="size-10"
            />
            <div className="flex items-center gap-x-1 flex-wrap">
              <span>LP {coinConfig.coinName}</span>
              <span className="text-white/50 text-xs">
                {dayjs(parseInt(coinConfig?.maturity)).format("MMM DD YYYY")}
              </span>
            </div>
          </TableCell>

          {/* Type */}
          <TableCell className="text-center">LP</TableCell>

          {/* Value */}
          <TableCell className="text-center space-x-1">
            {isPtYtLoading ? (
              <Skeleton className="h-6 w-20 mx-auto" />
            ) : (
              <>
                <span>
                  {ptYtData?.lpPrice &&
                    new Decimal(lpBalance).mul(ptYtData.lpPrice).gt(0) &&
                    "≈"}
                </span>
                <span>
                  $
                  <SmallNumDisplay
                    value={formatDecimalValue(
                      ptYtData?.lpPrice && isValidAmount(ptYtData?.lpPrice)
                        ? new Decimal(ptYtData.lpPrice).mul(lpBalance)
                        : "0",
                      6,
                    )}
                  />
                </span>
              </>
            )}
          </TableCell>

          {/* Amount */}
          <TableCell className="text-center">
            <SmallNumDisplay value={lpBalance} />
          </TableCell>

          {/* Accrued Yield */}
          <TableCell className="text-center">
            <div className="flex items-center gap-x-2 justify-center">
              {isLpRewardLoading ? (
                <div className="flex items-center gap-x-2">
                  <div className="flex flex-col items-center w-24">
                    <Skeleton className="h-5 w-16 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  {marketState?.rewardMetrics &&
                  marketState?.rewardMetrics?.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <LoadingButton
                          onClick={() => {}}
                          loading={claimLoading}
                          buttonText="Claim"
                          loadingText="Claiming"
                          disabled={
                            !lpBalance ||
                            lpBalance === "0" ||
                            !lpPositions?.length ||
                            !marketState?.rewardMetrics?.length
                          }
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {marketState?.rewardMetrics?.map((metric, index) => (
                          <DropdownMenuItem
                            key={metric.tokenType}
                            onClick={() => {
                              setSelectedRewardIndex(index)
                              claimLpReward(index)
                            }}
                            className="flex items-center gap-2"
                          >
                            <span>
                              Claim {metric.tokenType ?? `Reward ${index + 1}`}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <LoadingButton
                      onClick={() => claimLpReward()}
                      loading={claimLoading}
                      buttonText="Claim"
                      loadingText="Claiming"
                      disabled={
                        !lpBalance ||
                        lpBalance === "0" ||
                        !lpPositions?.length ||
                        !marketState?.rewardMetrics?.length
                      }
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      {marketState?.rewardMetrics?.[selectedRewardIndex]
                        ?.tokenLogo && (
                        <img
                          src={
                            marketState?.rewardMetrics?.[selectedRewardIndex]
                              ?.tokenLogo
                          }
                          alt="reward token"
                          className="w-4 h-4"
                        />
                      )}
                      <span className="text-white text-sm break-all flex items-center gap-x-1">
                        <SmallNumDisplay value={lpReward || "0"} />
                        <RefreshButton
                          onRefresh={refetchLpReward}
                          className="shrink-0"
                        />
                      </span>
                    </div>
                    <span className="text-white/50 text-xs">
                      $
                      <SmallNumDisplay
                        value={
                          lpReward &&
                          marketState?.rewardMetrics?.[selectedRewardIndex]
                            ?.tokenPrice
                            ? formatDecimalValue(
                                new Decimal(lpReward).mul(
                                  marketState.rewardMetrics[selectedRewardIndex]
                                    .tokenPrice,
                                ),
                                Number(coinConfig?.decimal),
                              )
                            : "0"
                        }
                      />
                    </span>
                  </div>
                  {marketState?.rewardMetrics &&
                  marketState?.rewardMetrics?.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <LoadingButton
                          onClick={() => {}}
                          loading={claimLoading}
                          buttonText="Claim"
                          loadingText="Claiming"
                          disabled={
                            !lpBalance ||
                            lpBalance === "0" ||
                            !lpPositions?.length ||
                            !marketState?.rewardMetrics?.length
                          }
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {marketState?.rewardMetrics?.map((metric, index) => (
                          <DropdownMenuItem
                            key={metric.tokenType}
                            onClick={() => {
                              setSelectedRewardIndex(index)
                              claimLpReward(index)
                            }}
                            className="flex items-center gap-2"
                          >
                            <span>
                              Claim {metric.tokenType ?? `Reward ${index + 1}`}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <LoadingButton
                      onClick={() => claimLpReward()}
                      loading={claimLoading}
                      buttonText="Claim"
                      loadingText="Claiming"
                      disabled={
                        !lpBalance ||
                        lpBalance === "0" ||
                        !lpPositions?.length ||
                        !marketState?.rewardMetrics?.length
                      }
                    />
                  )}
                </>
              )}
            </div>
          </TableCell>

          {/* Actions */}
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
                loading={redeemLoading}
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
