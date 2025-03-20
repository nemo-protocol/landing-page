import { useState, useEffect, useRef, useMemo } from "react"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useCoinData from "@/hooks/useCoinData"
import Decimal from "decimal.js"
import { mergeAllCoins } from "@/lib/txHelper"
import { Transaction } from "@mysten/sui/transactions"

// Define the ContractCall interface
interface ContractCall {
  name: string
  timestamp: number
  result?: {
    output: string | null
    rawOutput: string | null
    coinName?: string
    error?: string
    debugInfo?: {
      digest: string
      effects: unknown
    }
  }
}

export default function Test() {
  const [calls, setCalls] = useState<ContractCall[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCoinType, setSelectedCoinType] =
    useState<string>("0x2::sui::SUI")
  const [customCoinType, setCustomCoinType] = useState<string>("")
  const { address, signAndExecuteTransaction } = useWallet()
  const resultsRef = useRef<HTMLDivElement>(null)

  const { data: suiData } = useCoinData(address, "0x2::sui::SUI")
  const { data: customCoinData } = useCoinData(
    address,
    customCoinType !== "" ? customCoinType : undefined,
  )

  const suiBalance = useMemo(() => {
    if (suiData?.length) {
      return suiData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** 9)
        .toString()
    }
    return "0"
  }, [suiData])

  const customCoinBalance = useMemo(() => {
    if (customCoinData?.length) {
      return customCoinData
        .reduce((total, coin) => total.add(coin.balance), new Decimal(0))
        .div(10 ** 9)
        .toString()
    }
    return "0"
  }, [customCoinData])

  const coinCount = useMemo(() => {
    if (selectedCoinType === "0x2::sui::SUI") {
      return suiData?.length || 0
    } else {
      return customCoinData?.length || 0
    }
  }, [selectedCoinType, suiData, customCoinData])

  useEffect(() => {
    if (resultsRef.current && calls.length > 0) {
      const scrollContainer = resultsRef.current
      scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }, [calls])

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleMergeCoins = async () => {
    if (!address) return

    setIsLoading(true)
    const timestamp = Date.now()

    const callInfo: ContractCall = {
      name: "mergeAllCoins",
      timestamp,
    }
    setCalls((prev) => [callInfo, ...prev])

    try {
      const tx = new Transaction()

      // Call mergeAllCoins function
      const coinType =
        selectedCoinType === "custom" ? customCoinType : selectedCoinType

      // We need to await the result since mergeAllCoins is async
      const primaryCoinId = await mergeAllCoins(tx, address, coinType)

      // Execute the transaction
      const result = await signAndExecuteTransaction({
        transaction: tx,
      })

      // Update call with result
      setCalls((prev) => {
        const newCalls = [...prev]
        const callIndex = newCalls.findIndex(
          (call) => call.timestamp === timestamp,
        )
        if (callIndex >= 0) {
          newCalls[callIndex] = {
            ...newCalls[callIndex],
            result: {
              output: `Successfully merged coins. Primary coin: ${primaryCoinId}`,
              rawOutput: JSON.stringify(result, null, 2),
              coinName: coinType,
              debugInfo: {
                digest: result.digest,
                effects: result.effects,
              },
            },
          }
        }
        return newCalls
      })
    } catch (error) {
      console.log("error", error)

      // Update call with error
      setCalls((prev) => {
        const newCalls = [...prev]
        const callIndex = newCalls.findIndex(
          (call) => call.timestamp === timestamp,
        )
        if (callIndex >= 0) {
          newCalls[callIndex] = {
            ...newCalls[callIndex],
            result: {
              output: null,
              rawOutput: null,
              coinName:
                selectedCoinType === "custom"
                  ? customCoinType
                  : selectedCoinType,
              error: error instanceof Error ? error.message : String(error),
            },
          }
        }
        return newCalls
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen bg-[#0E0F16] flex flex-col">
      <div className="flex-1 flex p-4 md:p-6 gap-4 md:gap-6 max-h-[calc(100vh-32px)] md:max-h-[calc(100vh-48px)]">
        {/* Left Panel - Test Buttons */}
        <div className="w-[500px] shrink-0 flex flex-col max-h-full bg-[#12121B] rounded-2xl md:rounded-3xl border border-white/[0.07]">
          <div className="p-4 md:p-6 border-b border-white/[0.07]">
            <h2 className="text-lg font-medium text-white/90 mb-4">
              Coin Merger Tool
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Select Coin Type
                </label>
                <select
                  className="w-full h-10 px-3 bg-black/20 text-white/90 rounded-xl focus:outline-none"
                  value={selectedCoinType}
                  onChange={(e) => setSelectedCoinType(e.target.value)}
                >
                  <option value="0x2::sui::SUI">SUI</option>
                  <option value="custom">Custom Coin Type</option>
                </select>
              </div>

              {selectedCoinType === "custom" && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Custom Coin Type
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-black/20 text-white/90 rounded-xl focus:outline-none"
                    placeholder="Enter coin type"
                    value={customCoinType}
                    onChange={(e) => setCustomCoinType(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm text-white/60">
                <div>
                  Balance:{" "}
                  {selectedCoinType === "0x2::sui::SUI"
                    ? suiBalance
                    : customCoinBalance}{" "}
                  {selectedCoinType === "0x2::sui::SUI" ? "SUI" : ""}
                </div>
                <div className="text-right">Coin Count: {coinCount}</div>
              </div>

              <button
                className="w-full flex items-center justify-center h-12 bg-[#2C62D8]/10 hover:bg-[#2C62D8]/20 text-[#2C62D8] rounded-xl disabled:opacity-50 disabled:hover:bg-[#2C62D8]/10 text-sm"
                onClick={handleMergeCoins}
                disabled={
                  !address ||
                  isLoading ||
                  coinCount <= 1 ||
                  (selectedCoinType === "custom" && !customCoinType)
                }
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#2C62D8]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Merging Coins...
                  </span>
                ) : (
                  "Merge All Coins"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 min-w-0 flex flex-col max-h-full bg-[#12121B] rounded-2xl md:rounded-3xl border border-white/[0.07]">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.07]">
            <div className="text-base font-medium text-white/90">
              Test Results
            </div>
            <button
              onClick={() => setCalls([])}
              className="flex items-center gap-2 px-3 h-8 text-sm text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear
            </button>
          </div>
          <div
            ref={resultsRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
          >
            {calls.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <svg
                  className="w-12 h-12 mb-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                    d="M19 11h2m-2 4h2m-8-8V5m0 2h2m-8 6h2m-2 4h2"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    strokeWidth={1.2}
                  />
                </svg>
                <div className="text-sm">Click the merge button to start</div>
              </div>
            ) : (
              <div className="w-full">
                {calls.map((call, index) => (
                  <div
                    key={call.timestamp}
                    className={`bg-black/20 rounded-xl p-3 md:p-4 text-sm md:text-base space-y-4 transition-all duration-500 ${
                      index === 0 && !call.result ? "animate-slide-in" : ""
                    }`}
                  >
                    {/* Contract Call */}
                    <div>
                      <div className="text-white/90 font-medium mb-2">
                        Operation
                      </div>
                      <div className="font-mono text-xs">
                        <div className="grid grid-cols-[160px,1fr] gap-2 mb-2">
                          <span className="text-white/40">Call:</span>
                          <div className="text-white/80 break-all">
                            {call.name}
                          </div>
                        </div>
                        <div className="grid grid-cols-[160px,1fr] gap-2 mb-2">
                          <span className="text-white/40">Coin Type:</span>
                          <div className="text-white/80 break-all">
                            {call.result?.coinName ||
                              (selectedCoinType === "custom"
                                ? customCoinType
                                : selectedCoinType)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Result */}
                    <div>
                      <div className="text-white/90 font-medium mb-2">
                        Result
                      </div>
                      {call.result ? (
                        <div className="text-white/80 space-y-2 animate-fade-in">
                          {call.result.error ? (
                            <div className="text-red-500 break-all whitespace-pre-wrap animate-fade-in">
                              Error: {String(call.result.error)}
                            </div>
                          ) : (
                            <div className="animate-fade-in space-y-2">
                              <div className="flex flex-col">
                                <span className="text-white/60 mb-2">
                                  Output:
                                </span>
                                <pre className="font-mono text-xs bg-black/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                                  {call.result.output}
                                </pre>
                              </div>

                              <div className="flex flex-col">
                                <span className="text-white/60 mb-2">
                                  Transaction Details:
                                </span>
                                <pre className="font-mono text-xs bg-black/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                                  {call.result.rawOutput}
                                </pre>
                                <button
                                  onClick={() =>
                                    handleCopy(
                                      call.result?.rawOutput || "",
                                      `${call.timestamp}-raw`,
                                    )
                                  }
                                  className="mt-2 self-end flex items-center gap-2 px-3 h-8 text-sm text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  {copiedField === `${call.timestamp}-raw` ? (
                                    <>
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-4 w-full bg-white/5 rounded"></div>
                          <div className="h-4 w-3/4 bg-white/5 rounded mr-auto"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          .scroll-smooth {
            scroll-behavior: smooth;
          }
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out forwards;
          }

          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }

          /* Loading animation */
          @keyframes pulse {
            0% {
              opacity: 0.4;
            }
            50% {
              opacity: 0.6;
            }
            100% {
              opacity: 0.4;
            }
          }
          .animate-pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }

          /* Webkit Scrollbar Styles */
          .scroll-smooth::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          .scroll-smooth::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .scroll-smooth::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }
          
          .scroll-smooth::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          /* Firefox Scrollbar Styles */
          .scroll-smooth {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          }
        `}
      </style>
    </div>
  )
}
