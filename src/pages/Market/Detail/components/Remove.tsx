import dayjs from "dayjs"
import Decimal from "decimal.js"
import { debounce } from "@/lib/utils"
import { useCoinConfig } from "@/queries"
import { network } from "@/config"
import { ChevronsDown } from "lucide-react"
import PoolSelect from "@/components/PoolSelect"
import AmountInput from "@/components/AmountInput"
import { Skeleton } from "@/components/ui/skeleton"
import ActionButton from "@/components/ActionButton"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useRedeemLp from "@/hooks/actions/useRedeemLp"
import { parseErrorMessage } from "@/lib/errorMapping"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import usePyPositionData from "@/hooks/usePyPositionData"
import useInputLoadingState from "@/hooks/useInputLoadingState"
import { useParams, useNavigate } from "react-router-dom"
import useBurnLpDryRun from "@/hooks/dryrun/useBurnLpDryRun"
import { useMemo, useState, useEffect, useCallback } from "react"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import useSwapExactPtForSyDryRun from "@/hooks/dryrun/useSwapExactPtForSyDryRun"
import useMarketStateData from "@/hooks/useMarketStateData"
import { ContractError } from "@/hooks/types"

export default function Remove() {
  const navigate = useNavigate()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [lpValue, setLpValue] = useState("")
  const [error, setError] = useState<string>()
  const { account: currentAccount } = useWallet()
  const [warning, setWarning] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [targetValue, setTargetValue] = useState("")
  const [isRemoving, setIsRemoving] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string>()
  const [isInputLoading, setIsInputLoading] = useState(false)
  const [status, setStatus] = useState<"Success" | "Failed">()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

  const decimal = useMemo(() => Number(coinConfig?.decimal), [coinConfig])

  const { data: marketState } = useMarketStateData(coinConfig?.marketStateId)

  const { data: ptYtData, refresh: refreshPtYt } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

  const { mutateAsync: burnLpDryRun } = useBurnLpDryRun(coinConfig)
  const { mutateAsync: swapExactPtForSyDryRun } =
    useSwapExactPtForSyDryRun(coinConfig)

  const { data: lppMarketPositionData, refetch: refetchLpPosition } =
    useLpMarketPositionData(
      address,
      coinConfig?.marketStateId,
      coinConfig?.maturity,
      coinConfig?.marketPositionTypeList,
    )

  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const { isLoading } = useInputLoadingState(lpValue, isConfigLoading)

  const lpCoinBalance = useMemo(() => {
    if (lppMarketPositionData?.length) {
      return lppMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(9)
    }
    return "0"
  }, [decimal, lppMarketPositionData])

  const insufficientBalance = useMemo(
    () => new Decimal(lpCoinBalance).lt(new Decimal(lpValue || 0)),
    [lpCoinBalance, lpValue],
  )

  const lpPrice = useMemo(() => {
    if (coinConfig?.coinPrice && ptYtData?.ptPrice) {
      return new Decimal(coinConfig.coinPrice).add(ptYtData.ptPrice).toString()
    }
    return "0"
  }, [coinConfig?.coinPrice, ptYtData?.ptPrice])

  const debouncedGetSyOut = useCallback(
    (value: string, decimal: number) => {
      const getSyOut = debounce(async () => {
        setError(undefined)
        setWarning(undefined)
        if (value && value !== "0" && decimal) {
          setIsInputLoading(true)
          try {
            const [{ syAmount, ptAmount }] = await burnLpDryRun(value)
            let totalSyOut = new Decimal(syAmount)
            const [{ syAmount: ptToSy }] = await swapExactPtForSyDryRun({
              redeemValue: ptAmount,
            })
            totalSyOut = totalSyOut.add(ptToSy)
            const syOut = totalSyOut.div(10 ** decimal).toString()
            setTargetValue(syOut)
          } catch (error) {
            const [{ syAmount, ptAmount }] = await burnLpDryRun(value)
            const syOut = new Decimal(syAmount).div(10 ** decimal).toString()
            const ptOut = new Decimal(ptAmount).div(10 ** decimal).toString()
            setWarning(
              `Returning ${ptOut} PT ${coinConfig?.coinName} which could be redeemed after maturity`,
            )
            setTargetValue(syOut)
          } finally {
            setIsInputLoading(false)
          }
        } else {
          setTargetValue("")
        }
      }, 500)

      getSyOut()
      return getSyOut.cancel
    },
    [burnLpDryRun, swapExactPtForSyDryRun, coinConfig?.coinName],
  )

  useEffect(() => {
    const cancelFn = debouncedGetSyOut(lpValue, decimal ?? 0)
    return () => {
      cancelFn()
    }
  }, [lpValue, decimal, debouncedGetSyOut])

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchLpPosition(),
      refetchPyPosition(),
    ])
  }, [refetchCoinConfig, refetchLpPosition, refetchPyPosition])

  const { mutateAsync: redeemLp } = useRedeemLp(coinConfig, marketState)

  async function remove() {
    if (
      decimal &&
      address &&
      coinType &&
      coinConfig &&
      !insufficientBalance &&
      lppMarketPositionData?.length
    ) {
      try {
        setIsRemoving(true)
        const { digest } = await redeemLp({
          lpAmount: lpValue,
          coinConfig,
          lpPositions: lppMarketPositionData,
          pyPositions: pyPositionData || [],
        })

        setTxId(digest)
        setOpen(true)
        setLpValue("")
        setStatus("Success")

        await refreshData()
        await refreshPtYt()
      } catch (errorMsg) {
        setOpen(true)
        setStatus("Failed")
        const { error: msg, detail } = parseErrorMessage(
          (errorMsg as ContractError)?.message ?? errorMsg,
        )
        setMessage(msg)
        setErrorDetail(detail)
      } finally {
        setIsRemoving(false)
      }
    }
  }

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <TransactionStatusDialog
        open={open}
        status={status}
        network={network}
        txId={txId}
        message={message}
        onClose={() => {
          setTxId("")
          setOpen(false)
        }}
      />
      <div className="flex flex-col items-center gap-y-4">
        <div className="w-full mb-4">
          <PoolSelect
            coinType={coinType}
            maturity={maturity}
            onChange={(coinAddress, maturity) => {
              navigate(`/market/detail/${coinAddress}/${maturity}/remove`, {
                replace: true,
              })
            }}
          />
        </div>

        <div className="bg-[#12121B] rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-white/[0.07] flex flex-col items-center gap-y-4 w-full">
          <h2 className="text-center text-xl">Remove Liquidity</h2>

          <AmountInput
            error={error}
            price={lpPrice}
            amount={lpValue}
            decimal={decimal}
            warning={warning}
            isLoading={isLoading}
            onChange={setLpValue}
            setWarning={setWarning}
            isBalanceLoading={false}
            isConnected={isConnected}
            errorDetail={errorDetail}
            coinBalance={lpCoinBalance}
            coinLogo={coinConfig?.coinLogo}
            isConfigLoading={isConfigLoading}
            coinName={`LP ${coinConfig?.coinName}`}
            coinNameComponent={
              <span className="text-base">LP {coinConfig?.coinName}</span>
            }
          />

          <ChevronsDown className="size-6" />

          <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
            <div className="flex flex-col items-end gap-y-1">
              <div className="flex items-center justify-between w-full h-[28px]">
                <span>Receiving</span>
                <span className="flex items-center gap-x-1.5 h-7">
                  {isInputLoading ? (
                    <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
                  ) : !lpValue ? (
                    "--"
                  ) : (
                    <>
                      <span>{targetValue}</span>
                      <span>{coinConfig?.coinName}</span>
                      {coinConfig?.coinLogo && (
                        <img
                          src={coinConfig.coinLogo}
                          alt={coinConfig.coinName}
                          className="size-7"
                        />
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="text-xs text-white/60">
                {coinConfig?.maturity
                  ? dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")
                  : "--"}
              </div>
            </div>
          </div>

          <ActionButton
            btnText="Remove Liquidity"
            onClick={remove}
            loading={isRemoving}
            disabled={
              lpValue === "" ||
              lpValue === "0" ||
              insufficientBalance ||
              new Decimal(lpValue).toNumber() === 0
            }
          />
        </div>
      </div>
    </div>
  )
}
