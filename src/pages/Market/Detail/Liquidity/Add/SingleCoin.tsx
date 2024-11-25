import Decimal from "decimal.js"
import { network } from "@/config"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
import { Transaction } from "@mysten/sui/transactions"
import { parseErrorMessage } from "@/lib/errorMapping"
import usePyPositionData from "@/hooks/usePyPositionData"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import { ConnectModal, useCurrentWallet } from "@mysten/dapp-kit"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import { getPriceVoucher } from "@/lib/txHelper"
import { LoaderCircle } from "lucide-react"
import TransactionStatusDialog from "@/components/TransactionStatusDialog"

export default function Mint({ slippage }: { slippage: string }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { currentWallet, isConnected } = useCurrentWallet()
  const [openConnect, setOpenConnect] = useState(false)

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: coinConfig, isLoading } = useCoinConfig(
    coinType,
    maturity,
    address,
  )

  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyStateId,
    coinConfig?.maturity,
    coinConfig?.pyPositionType,
  )

  const { data: dataRatio } = useQueryLPRatio(
    address,
    coinConfig?.marketStateId,
  )
  const ratio = useMemo(() => dataRatio?.syLpRate ?? 1, [dataRatio])

  const { data: coinData } = useCoinData(address, coinType)
  const coinBalance = useMemo(() => {
    if (coinData?.length) {
      return coinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(1e9)
        .toFixed(9)
    }
    return 0
  }, [coinData])

  const insufficientBalance = useMemo(
    () => new Decimal(coinBalance).lt(new Decimal(addValue || 0)),
    [coinBalance, addValue],
  )

  async function add() {
    if (
      address &&
      coinType &&
      coinConfig &&
      coinData?.length &&
      !insufficientBalance
    ) {
      try {
        const tx = new Transaction()

        let pyPosition
        let created = false
        if (!pyPositionData?.length) {
          created = true
          pyPosition = tx.moveCall({
            target: `${coinConfig.nemoContractId}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig.version),
              tx.object(coinConfig.pyStateId),
            ],
            typeArguments: [coinConfig.syCoinType],
          })[0]
        } else {
          pyPosition = tx.object(pyPositionData[0].id.id)
        }

        const [splitCoinForPY, splitCoin] = tx.splitCoins(
          coinData[0].coinObjectId,
          [
            new Decimal(addValue)
              .mul(1e9)
              .div(new Decimal(ratio).add(1))
              .toFixed(0),
            new Decimal(addValue)
              .mul(1e9)
              .mul(ratio || 1)
              .div(new Decimal(ratio).add(1))
              .toFixed(0),
          ],
        )

        const [syCoinForPY] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoinForPY,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucher] = getPriceVoucher(tx, coinConfig)

        tx.moveCall({
          target: `${coinConfig.nemoContractId}::yield_factory::mint_py`,
          arguments: [
            tx.object(coinConfig.version),
            syCoinForPY,
            priceVoucher,
            pyPosition,
            tx.object(coinConfig.pyStateId),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        const [syCoin] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::sy::deposit`,
          arguments: [
            tx.object(coinConfig.version),
            splitCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .mul(ratio || 1)
                .div(new Decimal(ratio || 1).add(1))
                .mul(1 - new Decimal(slippage).div(100).toNumber())
                .toFixed(0),
            ),
            tx.object(coinConfig.syStateId),
          ],
          typeArguments: [coinType, coinConfig.syCoinType],
        })

        const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig)

        const [lp, mp] = tx.moveCall({
          target: `${coinConfig.nemoContractId}::market::mint_lp`,
          arguments: [
            tx.object(coinConfig.version),
            syCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .div(new Decimal(ratio || 1).add(1))
                .toFixed(0),
            ),
            priceVoucherForMintLp,
            pyPosition,
            tx.object(coinConfig.pyStateId),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [coinConfig.syCoinType],
        })

        tx.transferObjects([lp, mp], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        const res = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        if (res.effects?.status.status === "failure") {
          setOpen(true)
          setTxId(res.digest)
          setStatus("Failed")
          setMessage(parseErrorMessage(res.effects?.status.error || ""))
          return
        }
        setTxId(res.digest)
        setOpen(true)
        setAddValue("")
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
            <span>Balance: {isConnected ? coinBalance : "--"}</span>
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
                <span className="px-2">{coinConfig?.coinName}</span>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              min={0}
              type="number"
              value={addValue}
              disabled={!isConnected || isLoading}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder={!isConnected ? "Please connect wallet" : ""}
              className={`bg-transparent h-full outline-none grow text-right min-w-0`}
            />
            {isConnected && (
              <span className="text-xs text-white/80">
                $
                {new Decimal(coinConfig?.sCoinPrice || 0)
                  .mul(addValue || 0)
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
                setAddValue(
                  new Decimal(coinBalance!).div(2).toFixed(coinConfig?.decimal),
                )
              }
            >
              Half
            </button>
            <button
              className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
              disabled={!isConnected}
              onClick={() =>
                setAddValue(
                  new Decimal(coinBalance!).toFixed(coinConfig?.decimal),
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
                <span className="px-2">LP {coinConfig?.coinName}</span>
              </>
            )}
          </div>
          <input
            disabled
            type="text"
            value={addValue && new Decimal(addValue).mul(ratio).toString()}
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
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full cursor-pointer h-14 flex items-center justify-center">
          Insufficient Balance
        </div>
      ) : (
        <button
          onClick={add}
          disabled={
            addValue === "" || Number(addValue) <= 0 || insufficientBalance
          }
          className={[
            "mt-7.5 px-8 py-2.5 rounded-full w-full",
            addValue === "" || Number(addValue) <= 0 || insufficientBalance
              ? "bg-[#0F60FF]/50 text-white/50 cursor-pointer h-14"
              : "bg-[#0F60FF] text-white",
          ].join(" ")}
        >
          Add Liquidity
        </button>
      )}
    </div>
  )
}
