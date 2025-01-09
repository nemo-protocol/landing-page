import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState, useCallback } from "react"
import { Transaction } from "@mysten/sui/transactions"
import usePyPositionData from "@/hooks/usePyPositionData"
import { ChevronsDown, Plus, Wallet as WalletIcon } from "lucide-react"
import { useCoinConfig, useQueryMintPYRatio } from "@/queries"
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
  const [openConnect, setOpenConnect] = useState(false)
  const [ptRedeemValue, setPTRedeemValue] = useState("")
  const [ytRedeemValue, setYTRedeemValue] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)

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

  const { data: mintPYRatio } = useQueryMintPYRatio(coinConfig?.marketStateId)
  const ptRatio = useMemo(() => mintPYRatio?.syPtRate ?? 1, [mintPYRatio])
  const ytRatio = useMemo(() => mintPYRatio?.syYtRate ?? 1, [mintPYRatio])

  const ptBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.pt_balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [pyPositionData, decimal])

  const ytBalance = useMemo(() => {
    if (pyPositionData?.length) {
      return pyPositionData
        .reduce((total, coin) => total.add(coin.yt_balance), new Decimal(0))
        .div(10 ** decimal)
        .toFixed(decimal)
    }
    return "0"
  }, [pyPositionData, decimal])

  const insufficientBalance = useMemo(() => {
    return (
      new Decimal(ptBalance).lt(ptRedeemValue || 0) ||
      new Decimal(ytBalance).lt(ytRedeemValue || 0)
    )
  }, [ptBalance, ytBalance, ptRedeemValue, ytRedeemValue])

  const refreshData = useCallback(async () => {
    await Promise.all([refetchCoinConfig(), refetchPyPosition()])
  }, [refetchCoinConfig, refetchPyPosition])

  async function redeem() {
    if (
      !insufficientBalance &&
      coinConfig &&
      coinType &&
      address &&
      ptRedeemValue &&
      ytRedeemValue
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
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        const syCoin = redeemPy(
          tx,
          coinConfig,
          ytRedeemValue,
          ptRedeemValue,
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
        setPTRedeemValue("")
        setYTRedeemValue("")
        setStatus("Success")

        await refreshData()
      } catch (error) {
        console.log("tx error", error)
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
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
              value={ptRedeemValue}
              disabled={!isConnected}
              onChange={(e) => setPTRedeemValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.ptPrice || 0)
                  .mul(ptRedeemValue || 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setPTRedeemValue(new Decimal(ptBalance).div(2).toFixed(decimal))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setPTRedeemValue(new Decimal(ptBalance).toFixed(decimal))
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
              value={ytRedeemValue}
              disabled={!isConnected}
              onChange={(e) => setYTRedeemValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.ptPrice || 0)
                  .mul(ytRedeemValue || 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setYTRedeemValue(new Decimal(ytBalance).div(2).toFixed(decimal))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setYTRedeemValue(new Decimal(ytBalance).toFixed(decimal))
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
          <input
            disabled
            type="text"
            value={
              (ptRedeemValue || ytRedeemValue) &&
              Math.min(
                new Decimal(ptRedeemValue || 0).div(ptRatio).toNumber(),
                new Decimal(ytRedeemValue || 0).div(ytRatio).toNumber(),
              ).toFixed(9)
            }
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      <div className="mt-7.5">
        <ActionButton
          btnText="Redeem"
          onClick={redeem}
          loading={isRedeeming}
          openConnect={openConnect}
          setOpenConnect={setOpenConnect}
          insufficientBalance={insufficientBalance}
          disabled={ptRedeemValue === "" || ytRedeemValue === ""}
        />
      </div>
    </div>
  )
}
