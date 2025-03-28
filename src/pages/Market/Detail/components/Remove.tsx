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
import useBurnLpDryRun from "@/hooks/dryRun/useBurnLpDryRun"
import { useMemo, useState, useEffect, useCallback } from "react"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import { showTransactionDialog } from "@/lib/dialog"
import useMarketStateData from "@/hooks/useMarketStateData"
import { ContractError } from "@/hooks/types"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDecimalValue } from "@/lib/utils"
import useSellPtDryRun from "@/hooks/dryRun/pt/useSellPtDryRun"
import { NEED_MIN_VALUE_LIST } from "@/lib/constants"

export default function Remove() {
  const navigate = useNavigate()
  const { coinType, maturity } = useParams()
  const [lpValue, setLpValue] = useState("")
  const [error, setError] = useState<string>()
  const { account: currentAccount } = useWallet()
  const [warning, setWarning] = useState<string>()
  const [warningDetail, setWarningDetail] = useState<string>()
  const [targetValue, setTargetValue] = useState("")
  const [isRemoving, setIsRemoving] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string>()
  const [isInputLoading, setIsInputLoading] = useState(false)
  const [receivingType, setReceivingType] = useState<"underlying" | "sy">(
    "underlying",
  )

  const [minValue, setMinValue] = useState<number>(0)

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const {
    data: coinConfig,
    isLoading: isConfigLoading,
    refetch: refetchCoinConfig,
  } = useCoinConfig(coinType, maturity, address)

  useEffect(() => {
    const minValue =
      NEED_MIN_VALUE_LIST.find((item) => item.coinType === coinConfig?.coinType)
        ?.minValue || 0
    setMinValue(minValue)
  }, [coinConfig])

  const { mutateAsync: sellPtDryRun } = useSellPtDryRun(coinConfig)

  const decimal = useMemo(() => Number(coinConfig?.decimal), [coinConfig])

  const { data: marketState } = useMarketStateData(coinConfig?.marketStateId)

  const { data: ptYtData, refresh: refreshPtYt } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

  const { mutateAsync: burnLpDryRun } = useBurnLpDryRun(coinConfig)

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
    if (ptYtData?.lpPrice) {
      return new Decimal(ptYtData.lpPrice).toString()
    }
    return "0"
  }, [ ptYtData?.lpPrice])

  const debouncedGetSyOut = useCallback(
    (value: string, decimal: number) => {
      const getSyOut = debounce(async () => {
        setError(undefined)
        setWarning(undefined)
        if (value && value !== "0" && decimal) {
          if (
            receivingType === "underlying" &&
            new Decimal(minValue).gt(0) &&
            new Decimal(value).lt(minValue)
          ) {
            setError("The minimum redeem amount is 3")
            return
          }
          setIsInputLoading(true)
          try {
            const lpAmount = new Decimal(value).mul(10 ** decimal).toFixed(0)
            const [{ ptAmount, ptValue, outputValue }] = await burnLpDryRun({
              lpAmount,
              receivingType,
            })

            try {
              const { outputValue: swappedOutputValue } = await sellPtDryRun({
                ptAmount,
                minSyOut: "0",
                receivingType,
                pyPositions: pyPositionData,
              })

              const targetValue = new Decimal(outputValue)
                .add(swappedOutputValue)
                .toFixed(decimal)

              setTargetValue(targetValue)
            } catch (error) {
              setTargetValue(outputValue)
              setWarning(`Returning ${ptValue} PT ${coinConfig?.coinName}.`)
              setWarningDetail(
                `PT could be sold at the market, or it could be redeemed after maturity with a fixed return.`,
              )
              console.log("sellPtDryRun error", error)
            }
          } catch (error) {
            console.log("burnLpDryRun error", error)
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
    [
      receivingType,
      minValue,
      burnLpDryRun,
      sellPtDryRun,
      pyPositionData,
      coinConfig?.coinName,
    ],
  )

  const btnText = useMemo(() => {
    if (insufficientBalance) {
      return `Insufficient LP ${coinConfig?.coinName} balance`
    }
    if (lpValue === "") {
      return "Please enter an amount"
    }
    return "Remove"
  }, [insufficientBalance, lpValue, coinConfig?.coinName])

  useEffect(() => {
    const cancelFn = debouncedGetSyOut(lpValue, decimal ?? 0)
    return () => {
      cancelFn()
    }
  }, [lpValue, decimal, debouncedGetSyOut, receivingType])

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchCoinConfig(),
      refetchLpPosition(),
      refetchPyPosition(),
    ])
  }, [refetchCoinConfig, refetchLpPosition, refetchPyPosition])

  const { mutateAsync: redeemLp } = useRedeemLp(coinConfig, marketState)

  const convertReceivingValue = useCallback(
    (value: string, fromType: string, toType: string) => {
      if (!value || !decimal || !coinConfig?.conversionRate) return ""

      const conversionRate = new Decimal(coinConfig.conversionRate)

      if (fromType === "underlying" && toType === "sy") {
        return new Decimal(value).div(conversionRate).toString()
      } else if (fromType === "sy" && toType === "underlying") {
        return new Decimal(value).mul(conversionRate).toString()
      }
      return value
    },
    [decimal, coinConfig],
  )

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
        const lpAmount = new Decimal(lpValue).mul(10 ** decimal).toFixed(0)
        const { digest } = await redeemLp({
          lpAmount,
          coinConfig,
          receivingType,
          pyPositions: pyPositionData || [],
          lpPositions: lppMarketPositionData,
        })

        showTransactionDialog({
          status: "Success",
          network,
          txId: digest,
          onClose: async () => {
            await refreshData()
            await refreshPtYt()
          },
        })

        setLpValue("")
      } catch (errorMsg) {
        const { error: msg, detail } = parseErrorMessage(
          (errorMsg as ContractError)?.message ?? errorMsg,
        )
        setErrorDetail(detail)
        showTransactionDialog({
          status: "Failed",
          network,
          txId: "",
          message: msg,
        })
      } finally {
        setIsRemoving(false)
      }
    }
  }

  return (
    <div className="w-full bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-3 sm:gap-y-4">
        <div className="w-full mb-2 sm:mb-4">
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

        <div className="bg-[#12121B] rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 border border-white/[0.07] flex flex-col items-center gap-y-3 sm:gap-y-4 w-full">
          <h2 className="text-center text-base sm:text-xl">Remove Liquidity</h2>

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
            warningDetail={warningDetail}
            coinLogo={coinConfig?.coinLogo}
            isConfigLoading={isConfigLoading}
            coinName={`LP ${coinConfig?.coinName}`}
            coinNameComponent={
              <span className="text-sm sm:text-base">
                LP {coinConfig?.coinName}
              </span>
            }
          />

          <ChevronsDown className="size-5 sm:size-6" />

          <div className="rounded-lg sm:rounded-xl border border-[#2D2D48] px-3 sm:px-4 py-4 sm:py-6 w-full text-xs sm:text-sm">
            <div className="flex flex-col items-end gap-y-0.5 sm:gap-y-1">
              <div className="flex items-center justify-between w-full h-[24px] sm:h-[28px]">
                <span>Receiving</span>
                <span className="flex items-center gap-x-1 sm:gap-x-1.5 h-6 sm:h-7">
                  {isInputLoading ? (
                    <Skeleton className="h-6 sm:h-7 w-[140px] sm:w-[180px] bg-[#2D2D48]" />
                  ) : !lpValue ? (
                    "0"
                  ) : (
                    <div className="flex items-center gap-x-1 sm:gap-x-1.5">
                      <span>{formatDecimalValue(targetValue, decimal)}</span>
                    </div>
                  )}
                  <Select
                    value={receivingType}
                    onValueChange={(value) => {
                      const newTargetValue = convertReceivingValue(
                        targetValue,
                        receivingType,
                        value,
                      )
                      setReceivingType(value as "underlying" | "sy")
                      setTargetValue(newTargetValue)
                    }}
                  >
                    <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-sm sm:text-base w-fit">
                      <SelectValue>
                        <div className="flex items-center gap-x-1">
                          <span>
                            {receivingType === "underlying"
                              ? coinConfig?.underlyingCoinName
                              : coinConfig?.coinName}
                          </span>
                          {(receivingType === "underlying"
                            ? coinConfig?.underlyingCoinLogo
                            : coinConfig?.coinLogo) && (
                            <img
                              src={
                                receivingType === "underlying"
                                  ? coinConfig?.underlyingCoinLogo
                                  : coinConfig?.coinLogo
                              }
                              alt={
                                receivingType === "underlying"
                                  ? coinConfig?.underlyingCoinName
                                  : coinConfig?.coinName
                              }
                              className="size-4 sm:size-5"
                            />
                          )}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-none outline-none bg-[#0E0F16]">
                      <SelectGroup>
                        <SelectItem
                          value="underlying"
                          className="cursor-pointer text-white"
                        >
                          <div className="flex items-center gap-x-1">
                            <span>{coinConfig?.underlyingCoinName}</span>
                            {coinConfig?.underlyingCoinLogo && (
                              <img
                                src={coinConfig.underlyingCoinLogo}
                                alt={coinConfig.underlyingCoinName}
                                className="size-4 sm:size-5"
                              />
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="sy"
                          className="cursor-pointer text-white"
                        >
                          <div className="flex items-center gap-x-1">
                            <span>{coinConfig?.coinName}</span>
                            {coinConfig?.coinLogo && (
                              <img
                                src={coinConfig.coinLogo}
                                alt={coinConfig.coinName}
                                className="size-4 sm:size-5"
                              />
                            )}
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-white/60">
                {coinConfig?.maturity
                  ? dayjs(parseInt(coinConfig.maturity)).format("DD MMM YYYY")
                  : "--"}
              </div>
            </div>
          </div>

          <ActionButton
            onClick={remove}
            btnText={btnText}
            loading={isRemoving}
            disabled={
              !!error ||
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
