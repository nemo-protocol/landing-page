import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState, useCallback, useEffect } from "react"
import { Transaction } from "@mysten/sui/transactions"
import usePyPositionData from "@/hooks/usePyPositionData"
import { ChevronsDown, Plus, Wallet as WalletIcon } from "lucide-react"
import { useCoinConfig } from "@/queries"
import { useCalculatePtYt } from "@/hooks/usePtYtRatio"
import { parseErrorMessage } from "@/lib/errorMapping"
import {
  initPyPosition,
  getPriceVoucher,
  redeemPy,
  redeemSyCoin,
} from "@/lib/txHelper"
import { useWallet } from "@nemoprotocol/wallet-kit"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import ActionButton from "@/components/ActionButton"
import useRedeemPYDryRun from "@/hooks/dryRun/useRedeemPYDryRun"
import { debounce, formatDecimalValue } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import useMarketStateData from "@/hooks/useMarketStateData"
import { ContractError } from "@/hooks/types"

export default function Redeem({
  maturity,
  coinType,
}: {
  maturity: string
  coinType: string
}) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [redeemValue, setRedeemValue] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [isInputLoading, setIsInputLoading] = useState(false)
  const [syAmount, setSyAmount] = useState("")

  const { address, signAndExecuteTransaction } = useWallet()
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, refetch: refetchCoinConfig } = useCoinConfig(
    coinType,
    maturity,
  )
  const { data: pyPositionData, refetch: refetchPyPosition } =
    usePyPositionData(
      address,
      coinConfig?.pyStateId,
      coinConfig?.maturity,
      coinConfig?.pyPositionTypeList,
    )

  const decimal = useMemo(() => Number(coinConfig?.decimal), [coinConfig])

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return formatDecimalValue(
        pyPositionData
          .reduce((total, coin) => total.add(coin.ptBalance), new Decimal(0))
          .div(10 ** decimal),
        decimal,
      )
    }
    return "0"
  }, [pyPositionData, decimal])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return formatDecimalValue(
        pyPositionData
          .reduce((total, coin) => total.add(coin.ytBalance), new Decimal(0))
          .div(10 ** decimal),
        decimal,
      )
    }
    return "0"
  }, [pyPositionData, decimal])

  const insufficientPtBalance = useMemo(() => {
    return new Decimal(ptBalance).lt(redeemValue || 0)
  }, [ptBalance, redeemValue])

  const insufficientYtBalance = useMemo(() => {
    return new Decimal(ytBalance).lt(redeemValue || 0)
  }, [ytBalance, redeemValue])

  const refreshData = useCallback(async () => {
    await Promise.all([refetchCoinConfig(), refetchPyPosition()])
  }, [refetchCoinConfig, refetchPyPosition])

  const { data: marketState } = useMarketStateData(coinConfig?.marketStateId)

  const { data: ptYtData, refetch: refetchPtYtData } = useCalculatePtYt(
    coinConfig,
    marketState,
  )

  const { mutateAsync: redeemDryRun } = useRedeemPYDryRun(coinConfig)

  const debouncedGetRedeemOut = useCallback(
    (value: string, decimal: number) => {
      const getRedeemOut = debounce(async () => {
        if (value && value !== "0" && decimal) {
          setIsInputLoading(true)
          try {
            const [syAmount] = await redeemDryRun({
              ptRedeemValue: value,
              ytRedeemValue: value,
              pyPositions: pyPositionData,
            })
            setSyAmount(syAmount)
          } catch (error) {
            console.error("Dry run error:", error)
            setSyAmount("")
          } finally {
            setIsInputLoading(false)
          }
        } else {
          setSyAmount("")
        }
      }, 500)

      getRedeemOut()
      return getRedeemOut.cancel
    },
    [redeemDryRun, pyPositionData],
  )

  useEffect(() => {
    const cancelFn = debouncedGetRedeemOut(redeemValue, decimal)
    return () => {
      cancelFn()
    }
  }, [redeemValue, decimal, debouncedGetRedeemOut])

  async function redeem() {
    if (
      !insufficientPtBalance &&
      !insufficientYtBalance &&
      coinConfig &&
      coinType &&
      address &&
      redeemValue
    ) {
      try {
        setIsRedeeming(true)
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const syCoin = redeemPy(
          tx,
          coinConfig,
          redeemValue,
          redeemValue,
          priceVoucher,
          pyPosition,
        )

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

        tx.transferObjects([yieldToken], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
        })
        setTxId(res.digest)
        setOpen(true)
        setRedeemValue("")
        setStatus("Success")

        await Promise.all([refreshData(), refetchPtYtData()])
      } catch (errorMsg) {
        setOpen(true)
        setStatus("Failed")
        const { error } = parseErrorMessage(
          (errorMsg as ContractError)?.message ?? errorMsg,
        )
        setMessage(error)
      } finally {
        setIsRedeeming(false)
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
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
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between w-full">
          <div className="text-white">Input</div>
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? ptBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className={
                coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
              }
            />
            <span>PT {coinConfig?.coinName}</span>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              min={0}
              type="number"
              value={redeemValue}
              disabled={!isConnected}
              onChange={(e) => setRedeemValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {ptYtData?.ptPrice
                  ? new Decimal(ptYtData.ptPrice)
                      .mul(redeemValue || 0)
                      .toFixed(2)
                  : "0.00"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer disabled:opacity-50"
            disabled={!isConnected}
            onClick={() =>
              setRedeemValue(new Decimal(ptBalance).div(2).toFixed(decimal))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer disabled:opacity-50"
            disabled={!isConnected}
            onClick={() =>
              setRedeemValue(new Decimal(ptBalance).toFixed(decimal))
            }
          >
            Max
          </button>
        </div>
      </div>
      <Plus className="mx-auto" />
      <div className="flex flex-col w-full mt-[18px]">
        <div className="flex items-center justify-end w-full">
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? ytBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className={
                coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
              }
            />
            <span>YT {coinConfig?.coinName}</span>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              min={0}
              type="number"
              value={redeemValue}
              disabled={!isConnected}
              onChange={(e) => setRedeemValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {ptYtData?.ytPrice
                  ? new Decimal(ptYtData.ytPrice)
                      .mul(redeemValue || 0)
                      .toFixed(2)
                  : "0.00"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer disabled:opacity-50"
            disabled={!isConnected}
            onClick={() =>
              setRedeemValue(new Decimal(ytBalance).div(2).toFixed(decimal))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer disabled:opacity-50"
            disabled={!isConnected}
            onClick={() =>
              setRedeemValue(new Decimal(ytBalance).toFixed(decimal))
            }
          >
            Max
          </button>
        </div>
      </div>
      <ChevronsDown className="mx-auto mt-5" />
      <div className="flex flex-col gap-y-4.5 w-full">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <img
              src={coinConfig?.coinLogo}
              alt={coinConfig?.coinName}
              className={
                coinConfig?.coinLogo ? "size-6" : "size-6 rounded-full"
              }
            />
            <span>{coinConfig?.coinName}</span>
          </div>
          <div className="text-right grow">
            {isInputLoading ? (
              <div className="flex justify-end">
                <Skeleton className="h-7 w-[180px] bg-[#2D2D48]" />
              </div>
            ) : (
              syAmount &&
              new Decimal(syAmount).div(10 ** decimal).toFixed(decimal)
            )}
          </div>
        </div>
      </div>
      <div className="mt-7.5 w-full">
        <ActionButton
          btnText={
            insufficientPtBalance
              ? "Insufficient PT Balance"
              : insufficientYtBalance
                ? "Insufficient YT Balance"
                : "Redeem"
          }
          onClick={redeem}
          loading={isRedeeming}
          disabled={
            redeemValue === "" || insufficientPtBalance || insufficientYtBalance
          }
        />
      </div>
    </div>
  )
}
