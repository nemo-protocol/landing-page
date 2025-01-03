import dayjs from "dayjs"
import Decimal from "decimal.js"
import { network, DEBUG } from "@/config"
import { useMemo, useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Transaction } from "@mysten/sui/transactions"
import usePyPositionData from "@/hooks/usePyPositionData"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import { parseErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import {
  initPyPosition,
  mergeLpPositions,
  redeemSyCoin,
  burnLp,
} from "@/lib/txHelper"
import { useWallet, ConnectModal } from "@nemoprotocol/wallet-kit"
import { ChevronsDown } from "lucide-react"
import AmountInput from "@/components/AmountInput"
import { Skeleton } from "@/components/ui/skeleton"
import PoolSelect from "@/components/PoolSelect"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useCoinConfig } from "@/queries"
import useBurnLpOutDryRun from "@/hooks/useBurnLpOutDryRun"
import { ContractError } from "@/hooks/types"

export default function Remove() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [lpValue, setLpValue] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const [error, setError] = useState<string>()
  const { account: currentAccount, signAndExecuteTransaction } = useWallet()
  const [isInputLoading, setIsInputLoading] = useState(false)
  const navigate = useNavigate()

  const address = useMemo(() => currentAccount?.address, [currentAccount])
  const isConnected = useMemo(() => !!address, [address])

  const { data: coinConfig, isLoading: isConfigLoading } = useCoinConfig(
    coinType,
    maturity,
    address,
  )

  const decimal = useMemo(() => coinConfig?.decimal, [coinConfig])

  const { mutateAsync: burnLpDryRun } = useBurnLpOutDryRun(coinConfig)

  const { data: lppMarketPositionData } = useLpMarketPositionData(
    address,
    coinConfig?.marketStateId,
    coinConfig?.maturity,
    coinConfig?.marketPositionTypeList,
  )

  const { data: pyPositionData,refetch } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionTypeList,
  )

  const { isLoading } = useLoadingState(lpValue, isConfigLoading)

  const lpCoinBalance = useMemo(() => {
    if (lppMarketPositionData?.length) {
      return lppMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(10 ** (coinConfig?.decimal ?? 0))
        .toFixed(9)
    }
    return "0"
  }, [coinConfig?.decimal, lppMarketPositionData])

  const insufficientBalance = useMemo(
    () => new Decimal(lpCoinBalance).lt(new Decimal(lpValue || 0)),
    [lpCoinBalance, lpValue],
  )

  useEffect(() => {
    const getSyOut = async () => {
      if (lpValue && lpValue !== "0" && decimal) {
        setIsInputLoading(true)
        try {
          const amount = new Decimal(lpValue).mul(10 ** decimal).toString()
          const [[syOut]] = await burnLpDryRun(amount)
          const syAmount = new Decimal(syOut).div(10 ** decimal).toString()
          setTargetValue(syAmount)
          setError(undefined)
        } catch (error) {
          setError((error as ContractError)?.message)
          console.error("Failed to get SY out:", error)
          setTargetValue("")
        } finally {
          setIsInputLoading(false)
        }
      } else {
        setTargetValue("")
      }
    }

    const timer = setTimeout(() => {
      getSyOut()
    }, 500)

    return () => clearTimeout(timer)
  }, [lpValue, decimal, burnLpDryRun])

  async function remove() {
    if (
      address &&
      coinType &&
      coinConfig &&
      !insufficientBalance &&
      lppMarketPositionData?.length
    ) {
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

        const mergedPositionId = mergeLpPositions(
          tx,
          coinConfig,
          lppMarketPositionData,
          lpValue,
          coinConfig.decimal,
        )

        const syCoin = burnLp(
          tx,
          coinConfig,
          lpValue,
          pyPosition,
          mergedPositionId,
        )

        const yieldToken = redeemSyCoin(tx, coinConfig, syCoin)

        tx.transferObjects([yieldToken], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          // chain: `sui:${network}`,
        })
        //TODO : handle error
        // if (res.effects?.status.status === "failure") {
        //   setOpen(true)
        //   setStatus("Failed")
        //   setTxId(res.digest)
        //   setMessage(parseErrorMessage(res.effects?.status.error || ""))
        //   return
        // }
        setTxId(res.digest)
        setOpen(true)
        setLpValue("")
        setStatus("Success")
        refetch()
      } catch (error) {
        if (DEBUG) {
          console.log("tx error", error)
        }
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
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
            amount={lpValue}
            price={coinConfig?.lpPrice}
            decimal={coinConfig?.decimal}
            coinName={`LP ${coinConfig?.coinName}`}
            coinLogo={coinConfig?.coinLogo}
            isLoading={isLoading}
            isConnected={isConnected}
            coinBalance={lpCoinBalance}
            onChange={setLpValue}
            isConfigLoading={isConfigLoading}
            isBalanceLoading={false}
            coinNameComponent={
              <span className="text-base">LP {coinConfig?.coinName}</span>
            }
          />

          <ChevronsDown className="size-6" />

          <div className="rounded-xl border border-[#2D2D48] px-4 py-6 w-full text-sm">
            <div className="flex flex-col items-end gap-y-1">
              <div className="flex items-center justify-between w-full">
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

          {/* Action Button */}
          {!isConnected ? (
            <ConnectModal
              open={openConnect}
              onOpenChange={(isOpen) => setOpenConnect(isOpen)}
            >
              <button className="mt-4 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-12 hover:bg-[#0F60FF]/90 transition-colors">
                Connect Wallet
              </button>
            </ConnectModal>
          ) : insufficientBalance ? (
            <div className="mt-4 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-12 flex items-center justify-center">
              Insufficient Balance
            </div>
          ) : (
            <button
              onClick={remove}
              disabled={
                lpValue === "" ||
                lpValue === "0" ||
                insufficientBalance ||
                new Decimal(lpValue).toNumber() === 0
              }
              className={[
                "mt-4 px-8 py-2.5 rounded-full w-full h-12 transition-colors",
                lpValue === "" ||
                lpValue === "0" ||
                insufficientBalance ||
                new Decimal(lpValue).toNumber() === 0
                  ? "bg-[#0F60FF]/50 text-white/50"
                  : "bg-[#0F60FF] text-white hover:bg-[#0F60FF]/90",
              ].join(" ")}
            >
              Remove Liquidity
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
