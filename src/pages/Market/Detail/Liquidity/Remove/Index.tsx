import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  ConnectModal,
  useCurrentAccount,
  useCurrentWallet,
} from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import usePyPositionData from "@/hooks/usePyPositionData"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import useLpMarketPositionData from "@/hooks/useLpMarketPositionData"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import { parseErrorMessage } from "@/lib/errorMapping"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"
import { LoaderCircle } from "lucide-react"
import { initPyPosition } from "@/lib/txHelper"

export default function Remove() {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [lpValue, setLpValue] = useState("")
  const [message, setMessage] = useState<string>()
  const { isConnected } = useCurrentWallet()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const [openConnect, setOpenConnect] = useState(false)
  const currentAccount = useCurrentAccount()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const address = useMemo(() => currentAccount?.address, [currentAccount])

  const { data: coinConfig, isLoading } = useCoinConfig(coinType, maturity)

  const { data: dataRatio } = useQueryLPRatio(
    address,
    coinConfig?.marketStateId,
  )
  const ratio = useMemo(() => dataRatio?.syLpRate || 0, [dataRatio])

  const { data: lppMarketPositionData } = useLpMarketPositionData(
    address,
    coinConfig?.marketStateId,
    coinConfig?.maturity,
    coinConfig?.marketPositionType,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const lpCoinBalance = useMemo(() => {
    if (lppMarketPositionData?.length) {
      return lppMarketPositionData
        .reduce((total, item) => total.add(item.lp_amount), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [lppMarketPositionData])

  const insufficientBalance = useMemo(
    () => new Decimal(lpCoinBalance).lt(new Decimal(lpValue || 0)),
    [lpCoinBalance, lpValue],
  )

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
          pyPosition = pyPosition = initPyPosition(tx, coinConfig)
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::burn_lp`,
          arguments: [
            tx.object(coinConfig.version),
            tx.pure.address(address),
            tx.pure.u64(new Decimal(lpValue).mul(1e9).toFixed(0)),
            pyPosition,
            tx.object(coinConfig.marketStateId),
            tx.object(lppMarketPositionData[0].id.id),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setStatus("Failed")
          setTxId(res.digest)
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setTxId(res.digest)
        setOpen(true)
        setLpValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        const msg = (error as Error)?.message ?? error
        setMessage(parseErrorMessage(msg || ""))
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
        onClose={() => setOpen(false)}
      />

      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between w-full">
          <div className="text-white">Input</div>
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? lpCoinBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            {isLoading ? (
              <LoaderCircle className="animate-spin size-6 text-white/60" />
            ) : (
              <>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-6"
                />
                <span>LP {coinConfig?.coinName}</span>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              min={0}
              type="number"
              value={lpValue}
              disabled={!isConnected}
              onChange={(e) => setLpValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.lpPrice || 0)
                  .mul(lpValue || 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
        </div>
        {isConnected && !isLoading && (
          <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
            <button
              className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
              disabled={!isConnected}
              onClick={() =>
                setLpValue(
                  new Decimal(lpCoinBalance!)
                    .div(2)
                    .toFixed(coinConfig?.decimal),
                )
              }
            >
              Half
            </button>
            <button
              className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
              disabled={!isConnected}
              onClick={() =>
                setLpValue(
                  new Decimal(lpCoinBalance!).toFixed(coinConfig?.decimal),
                )
              }
            >
              Max
            </button>
          </div>
        )}
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="flex flex-col w-full gap-y-4.5">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            {isLoading ? (
              <LoaderCircle className="animate-spin size-6 text-white/60" />
            ) : (
              <>
                <img
                  src={coinConfig?.coinLogo}
                  alt={coinConfig?.coinName}
                  className="size-6"
                />
                <span>{coinConfig?.coinName}</span>
              </>
            )}
          </div>
          <input
            disabled
            type="text"
            value={lpValue && new Decimal(lpValue).div(ratio).toString()}
            className="bg-transparent h-full outline-none grow text-right min-w-0"
          />
        </div>
      </div>
      {/* <div className="bg-[#2426325C] px-6 py-4 flex items-center justify-between w-full mt-6 rounded-xl">
        <span className="text-white/80">Total Pool APY</span>
        <span>{coinConfig?.lpApy || 0}</span>
      </div> */}
      {!isConnected ? (
        <ConnectModal
          open={openConnect}
          onOpenChange={(isOpen) => setOpenConnect(isOpen)}
          trigger={
            <button className="mt-7.5 px-8 py-2.5 bg-[#0F60FF] text-white rounded-full w-full h-14 cursor-pointer">
              Connect Wallet
            </button>
          }
        />
      ) : insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full h-14 cursor-pointer flex items-center justify-center">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={remove}
          disabled={lpValue === "" || insufficientBalance}
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full h-14",
            lpValue === "" || insufficientBalance
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Remove Liquidity
        </button>
      )}
    </div>
  )
}
