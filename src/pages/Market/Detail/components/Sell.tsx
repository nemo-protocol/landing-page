import Decimal from "decimal.js"
import { useParams } from "react-router-dom"
import { useEffect, useMemo, useState, useCallback } from "react"
import { Transaction } from "@mysten/sui/transactions"
import { ChevronsDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { network } from "@/config"
import { useCoinConfig } from "@/queries"
import usePyPositionData from "@/hooks/usePyPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import {
  initPyPosition,
  redeemSyCoin,
  getPriceVoucher,
  swapExactPtForSy,
  swapExactYtForSy,
} from "@/lib/txHelper"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import AmountInput from "@/components/AmountInput"
import ActionButton from "@/components/ActionButton"
import { formatDecimalValue } from "@/lib/utils"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useQuerySyOutFromYtInWithVoucher from "@/hooks/useQuerySyOutFromYtInWithVoucher"
import useQuerySyOutFromPtInWithVoucher from "@/hooks/useQuerySyOutFromPtInWithVoucher"
import { debounce } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ContractError } from "@/hooks/types"
import dayjs from "dayjs"

export default function Sell() {
  const { coinType, tokenType: _tokenType, maturity } = useParams()
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [tokenType, setTokenType] = useState("pt")
  const [redeemValue, setRedeemValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)

  const { address, signAndExecuteTransaction } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  useEffect(() => {
    if (_tokenType) {
      setTokenType(_tokenType)
    }
  }, [_tokenType])

  const { data: coinConfig, isLoading: isConfigLoading } = useCoinConfig(
    coinType,
    maturity,
  )
  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const { mutateAsync: querySyOutFromYt } =
    useQuerySyOutFromYtInWithVoucher(coinConfig)
  const { mutateAsync: querySyOutFromPt } =
    useQuerySyOutFromPtInWithVoucher(coinConfig)

  const debouncedGetSyOut = useCallback(
    debounce(async (value: string, decimal: number) => {
      if (value && value !== "0" && decimal) {
        try {
          const amount = new Decimal(value).mul(10 ** decimal).toString()
          console.log("Input amount:", amount)
          const syOut = await (
            tokenType === "yt" ? querySyOutFromYt : querySyOutFromPt
          )(amount)
          console.log("Raw syOut:", syOut)
          const syAmount = new Decimal(syOut[0]).div(10 ** decimal).toString()
          console.log("Formatted syAmount:", syAmount)
          setTargetValue(syAmount)
          setError(undefined)
        } catch (error) {
          setError((error as ContractError)?.message)
          console.error("Failed to get SY out:", error)
          setTargetValue("")
        }
      } else {
        setTargetValue("")
      }
    }, 500),
    [querySyOutFromYt, querySyOutFromPt, tokenType],
  )

  useEffect(() => {
    if (coinConfig?.decimal) {
      debouncedGetSyOut(redeemValue, coinConfig.decimal)
    }
    return () => {
      debouncedGetSyOut.cancel()
    }
  }, [redeemValue, coinConfig?.decimal, debouncedGetSyOut])

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(coinConfig?.decimal ?? 0)
    }
    return "0"
  }, [pyPositionData, coinConfig])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(coinConfig?.decimal ?? 0)
    }
    return "0"
  }, [pyPositionData, coinConfig])

  const insufficientBalance = useMemo(
    () =>
      tokenType == "pt"
        ? new Decimal(Number(ptBalance)).lt(redeemValue || 0)
        : new Decimal(Number(ytBalance)).lt(redeemValue || 0),
    [ptBalance, ytBalance, redeemValue, tokenType],
  )

  const handleInputChange = (value: string) => {
    setRedeemValue(value)
  }

  async function redeem() {
    if (!insufficientBalance && coinConfig && coinType && address) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const swapFn = tokenType === "pt" ? swapExactPtForSy : swapExactYtForSy
        const syCoin = swapFn(
          tx,
          coinConfig,
          redeemValue,
          pyPosition,
          priceVoucher,
        )
        const sCoin = redeemSyCoin(tx, coinConfig, syCoin)
        tx.transferObjects([sCoin], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(res.digest)
        setOpen(true)
        setRedeemValue("")
        setTargetValue("")
        setStatus("Success")
      } catch (error) {
        console.log("tx error", error)
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
      }
    }
  }

  const coinName = useMemo(
    () =>
      tokenType === "pt"
        ? `PT ${coinConfig?.coinName}`
        : `YT ${coinConfig?.coinName}`,
    [tokenType, coinConfig],
  )

  const price = useMemo(
    () => (tokenType === "pt" ? coinConfig?.ptPrice : coinConfig?.ytPrice),
    [tokenType, coinConfig],
  )

  const decimal = useMemo(() => coinConfig?.decimal, [coinConfig])

  return (
    <div className="w-full bg-[#12121B] rounded-3xl p-6 border border-white/[0.07]">
      <div className="flex flex-col items-center gap-y-4">
        <h2 className="text-center text-xl">Sell</h2>
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
        <AmountInput
          error={error}
          price={price}
          decimal={decimal}
          amount={redeemValue}
          coinName={coinName}
          isLoading={isConfigLoading}
          coinLogo={coinConfig?.coinLogo}
          coinBalance={tokenType === "pt" ? ptBalance : ytBalance}
          isConnected={isConnected}
          onChange={handleInputChange}
          coinNameComponent={
            <Select
              value={tokenType}
              onValueChange={(value) => {
                setTokenType(value)
                setRedeemValue("")
                setTargetValue("")
              }}
            >
              <SelectTrigger className="border-none focus:ring-0 p-0 h-auto focus:outline-none bg-transparent text-base w-fit">
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent className="border-none outline-none bg-[#0E0F16]">
                <SelectGroup>
                  <SelectItem value="pt" className="cursor-pointer text-white">
                    PT {coinConfig?.coinName}
                  </SelectItem>
                  <SelectItem value="yt" className="cursor-pointer text-white">
                    YT {coinConfig?.coinName}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
        <ChevronsDown className="size-6" />
        <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
          <div className="flex flex-col items-end gap-y-1">
            <div className="flex items-center justify-between w-full h-[28px]">
              <span>Receiving</span>
              <span>
                {!redeemValue ? (
                  "--"
                ) : isConfigLoading ? (
                  <Skeleton className="h-7 w-48 bg-[#2D2D48]" />
                ) : !decimal ? (
                  "--"
                ) : (
                  <div className="flex items-center gap-x-1.5">
                    <span>
                      ≈ {formatDecimalValue(targetValue, decimal || 9)}
                    </span>
                    <span>{coinConfig?.coinName}</span>
                    {coinConfig?.coinLogo && (
                      <img
                        src={coinConfig.coinLogo}
                        alt={coinConfig.coinName}
                        className="size-[28px] inline-block align-middle"
                        onError={(e) => {
                          console.error("Logo load error:", e)
                          const img = e.target as HTMLImageElement
                          img.style.display = "none"
                        }}
                      />
                    )}
                  </div>
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
          btnText="Sell"
          onClick={redeem}
          openConnect={openConnect}
          setOpenConnect={setOpenConnect}
          insufficientBalance={insufficientBalance}
          disabled={["", undefined].includes(redeemValue)}
        />
      </div>
    </div>
  )
}
