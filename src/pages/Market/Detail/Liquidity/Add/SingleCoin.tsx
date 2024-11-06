import Decimal from "decimal.js"
import { network } from "@/config"
import { debounce } from "@/lib/utils"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import useCoinData from "@/hooks/useCoinData"
import { useCurrentWallet } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import usePyPositionData from "@/hooks/usePyPositionData"
import SwapIcon from "@/assets/images/svg/swap.svg?react"
import SSUIIcon from "@/assets/images/svg/sSUI.svg?react"
import FailIcon from "@/assets/images/svg/fail.svg?react"
import { useCoinConfig, useQueryLPRatio } from "@/queries"
import { PackageAddress, SYPackageAddress } from "@/contract"
import WalletIcon from "@/assets/images/svg/wallet.svg?react"
import SuccessIcon from "@/assets/images/svg/success.svg?react"
import useCustomSignAndExecuteTransaction from "@/hooks/useCustomSignAndExecuteTransaction"
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

export default function Mint({ slippage }: { slippage: string }) {
  const [txId, setTxId] = useState("")
  const [open, setOpen] = useState(false)
  const { coinType, maturity } = useParams()
  const [addValue, setAddValue] = useState("")
  const [message, setMessage] = useState<string>()
  const [status, setStatus] = useState<"Success" | "Failed">()
  const { currentWallet, isConnected } = useCurrentWallet()

  const { mutateAsync: signAndExecuteTransaction } =
    useCustomSignAndExecuteTransaction()

  const address = useMemo(
    () => currentWallet?.accounts[0].address,
    [currentWallet],
  )

  const { data: coinConfig } = useCoinConfig(coinType, maturity)
  const { data: pyPositionData } = usePyPositionData(
    address,
    coinConfig?.pyState,
    coinConfig?.maturity,
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
            target: `${PackageAddress}::py::init_py_position`,
            arguments: [
              tx.object(coinConfig.version),
              tx.object(coinConfig.pyState),
            ],
            typeArguments: [
              `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
            ],
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
          target: `${PackageAddress}::sy::deposit`,
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
            tx.object(coinConfig.syState),
          ],
          typeArguments: [
            coinType,
            `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
          ],
        })

        const [priceVoucher] = tx.moveCall({
          target: `${PackageAddress}::oracle::get_price_voucher_from_x_oracle`,
          arguments: [
            tx.object(coinConfig.providerVersion),
            tx.object(coinConfig.providerMarket),
            tx.object(coinConfig.syState),
            tx.object("0x6"),
          ],
          typeArguments: [
            `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
            `0x2::sui::SUI`,
          ],
        })

        tx.moveCall({
          target: `${PackageAddress}::yield_factory::mint_py`,
          arguments: [
            tx.object(coinConfig.version),
            syCoinForPY,
            priceVoucher,
            pyPosition,
            tx.object(coinConfig.pyState),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object("0x6"),
          ],
          typeArguments: [
            `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
          ],
        })

        const [syCoin] = tx.moveCall({
          target: `${PackageAddress}::sy::deposit`,
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
            tx.object(coinConfig.syState),
          ],
          typeArguments: [
            coinType,
            `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
          ],
        })

        const [lp, mp] = tx.moveCall({
          target: `${PackageAddress}::market::mint_lp`,
          arguments: [
            tx.object(coinConfig.version),
            syCoin,
            tx.pure.u64(
              new Decimal(addValue)
                .mul(1e9)
                .div(new Decimal(ratio || 1).add(1))
                .toFixed(0),
            ),
            priceVoucher,
            pyPosition,
            tx.object(coinConfig.pyState),
            tx.object(coinConfig.yieldFactoryConfigId),
            tx.object(coinConfig!.marketStateId),
            tx.object("0x6"),
          ],
          typeArguments: [
            `${SYPackageAddress}::${coinConfig.coinName}::${coinConfig.coinName.toLocaleUpperCase()}`,
          ],
        })

        tx.transferObjects([lp, mp, priceVoucher], address)

        if (created) {
          tx.transferObjects([pyPosition], address)
        }

        tx.setGasBudget(0.1 * 1e9)

        const { digest } = await signAndExecuteTransaction({
          transaction: tx,
          chain: `sui:${network}`,
        })
        setTxId(digest)
        setOpen(true)
        setAddValue("")
        setStatus("Success")
      } catch (error) {
        setOpen(true)
        setStatus("Failed")
        setMessage((error as Error)?.message ?? error)
      }
    }
  }

  const debouncedSetAddValue = debounce((value: string) => {
    setAddValue(value)
  }, 300)

  return (
    <div className="flex flex-col items-center">
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[#0e0f15] border-none rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-white">
              {status}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center">
              {status === "Success" ? <SuccessIcon /> : <FailIcon />}
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
              className="text-white w-36 rounded-3xl bg-[#0F60FF]"
              onClick={() => setOpen(false)}
            >
              OK
            </button>
          </div>
          <AlertDialogFooter></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between w-full">
          <div className="text-white">Input</div>
          <div className="flex items-center gap-x-1">
            <WalletIcon />
            <span>Balance: {isConnected ? coinBalance : "--"}</span>
          </div>
        </div>
        <div className="bg-black flex items-center justify-between p-1 gap-x-4 rounded-xl mt-[18px] w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16]">
            <SSUIIcon className="size-6" />
            <span className="px-2">sSUI</span>
          </div>
          <div className="flex flex-col items-end gap-y-1">
            <input
              type="text"
              disabled={!isConnected}
              onChange={(e) =>
                debouncedSetAddValue(new Decimal(e.target.value).toString())
              }
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
        <div className="flex items-center gap-x-2 justify-end mt-3.5 w-full">
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() =>
              setAddValue(new Decimal(coinBalance!).div(2).toFixed(9))
            }
          >
            Half
          </button>
          <button
            className="bg-[#1E212B] py-1 px-2 rounded-[20px] text-xs cursor-pointer"
            disabled={!isConnected}
            onClick={() => setAddValue(new Decimal(coinBalance!).toFixed(9))}
          >
            Max
          </button>
        </div>
      </div>
      <SwapIcon className="mx-auto mt-5" />
      <div className="flex flex-col w-full gap-y-4.5">
        <div>Output</div>
        <div className="bg-black flex items-center p-1 gap-x-4 rounded-xl w-full pr-5">
          <div className="flex items-center py-3 px-3 rounded-xl gap-x-2 bg-[#0E0F16] shrink-0">
            <SSUIIcon className="size-6" />
            <span className="px-2">LP sSUI</span>
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
      {insufficientBalance ? (
        <div className="mt-7.5 px-8 py-2.5 bg-[#0F60FF]/50 text-white/50 rounded-full w-full cursor-pointer h-14">
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
