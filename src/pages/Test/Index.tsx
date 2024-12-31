import Decimal from "decimal.js"
import { useCoinConfig } from "@/queries"
import { useState, useEffect, useRef } from "react"
import PoolSelect from "@/components/PoolSelect"
import { useWallet } from "@nemoprotocol/wallet-kit"
import useQueryButton, { QUERY_CONFIGS } from "@/hooks/useQueryButton"
import type { CoinConfig } from "@/queries/types/market"

interface ContractCall {
  name: string
  moveCall: {
    target: string
    arguments: string[]
    typeArguments: string[]
  }
  result?: {
    input: string
    output: string | null
    rawOutput: string | null
    coinName: string | undefined
    error?: string
  }
  timestamp: number
}

function QueryButton({ 
  config, 
  coinConfig, 
  address, 
  customAmount,
  setCustomAmount,
  isExpanded,
  toggleExpanded,
  onQuery,
  calls,
  queryType
}: {
  config: typeof QUERY_CONFIGS[keyof typeof QUERY_CONFIGS]
  coinConfig?: CoinConfig
  address?: string
  customAmount: string
  setCustomAmount: (value: string) => void
  isExpanded: boolean
  toggleExpanded: () => void
  onQuery: (callInfo: ContractCall) => void
  calls: ContractCall[]
  queryType: keyof typeof QUERY_CONFIGS
}) {
  const { 
    data: amount, 
    mutate: query,
    error,
    status
  } = useQueryButton(queryType, coinConfig, address)

  const isLoading = status === 'pending'

  const getInputAmount = (rawAmount: string) => {
    if (!coinConfig?.decimal) return "0"
    return new Decimal(rawAmount).div(10 ** coinConfig.decimal).toString()
  }

  const handleQuery = async (amount: string) => {
    if (!coinConfig) return
    const moveCall = {
      target: `${coinConfig.nemoContractId}::market::${config.target}`,
      arguments: [
        amount,
        "0",
        ...(config.needPriceVoucher ? ["priceVoucher"] : []),
        coinConfig.pyStateId,
        coinConfig.syStateId,
        coinConfig.marketFactoryConfigId,
        coinConfig.marketStateId,
        "0x6",
      ],
      typeArguments: [coinConfig.syCoinType],
    }
    const callInfo: ContractCall = {
      name: moveCall.target,
      moveCall,
      timestamp: Date.now()
    }
    onQuery(callInfo)
    await query(amount)
  }

  // Update call info when we get an error
  useEffect(() => {
    if (error && coinConfig && calls.length > 0) {
      const latestCall = calls[0]
      if (latestCall.name.includes(config.target) && !latestCall.result) {
        onQuery({
          ...latestCall,
          result: {
            input: getInputAmount(latestCall.moveCall.arguments[0]) + " Input",
            output: null,
            rawOutput: null,
            coinName: coinConfig.coinName,
            error: error instanceof Error ? error.message : String(error)
          }
        })
      }
    }
  }, [error, coinConfig, calls, config.target, onQuery, getInputAmount])

  // Update call info when we get a successful result
  useEffect(() => {
    if (amount && coinConfig && calls.length > 0) {
      const latestCall = calls[0]
      if (latestCall.name.includes(config.target) && !latestCall.result) {
        onQuery({
          ...latestCall,
          result: {
            input: getInputAmount(latestCall.moveCall.arguments[0]) + " Input",
            output: getInputAmount(amount) + " Output",
            rawOutput: amount,
            coinName: coinConfig.coinName,
          }
        })
      }
    }
  }, [amount, coinConfig, calls, config.target, onQuery, getInputAmount])

  return (
    <div className="bg-[#12121B] rounded-xl p-4 border border-white/[0.07]">
      <div className="space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={toggleExpanded}
        >
          <div className="text-sm font-medium text-white/90 break-all pr-4">
            {config.target}
          </div>
          <svg 
            className={`w-5 h-5 shrink-0 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex items-center justify-center h-10 bg-[#2C62D8]/10 hover:bg-[#2C62D8]/20 text-[#2C62D8] rounded-xl disabled:opacity-50 disabled:hover:bg-[#2C62D8]/10 text-sm"
              onClick={() => handleQuery("1000000")}
              disabled={!coinConfig || !address || isLoading}
            >
              0.001 Input
            </button>

            <div className="flex h-10 bg-black/20 rounded-xl overflow-hidden">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-20 px-3 bg-transparent text-white/90 text-sm focus:outline-none disabled:opacity-50"
                placeholder="Amount"
                disabled={!coinConfig || !address}
              />
              <button
                className="flex-1 flex items-center justify-center px-3 bg-[#2C62D8]/10 hover:bg-[#2C62D8]/20 text-[#2C62D8] disabled:opacity-50 disabled:hover:bg-[#2C62D8]/10 text-sm whitespace-nowrap border-l border-white/[0.07]"
                onClick={() => {
                  const amount = new Decimal(customAmount).mul(10 ** (coinConfig?.decimal || 6)).toString()
                  handleQuery(amount)
                }}
                disabled={!coinConfig || !address || isLoading}
              >
                Input
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Test() {
  const [coinType, setCoinType] = useState<string>()
  const [maturity, setMaturity] = useState<string>()
  const [calls, setCalls] = useState<ContractCall[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const { address } = useWallet()
  const resultsRef = useRef<HTMLDivElement>(null)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (resultsRef.current && calls.length > 0) {
      const scrollContainer = resultsRef.current
      
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }, [calls])

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const { data: coinConfig } = useCoinConfig(coinType, maturity, address)

  const queryButtons = Object.entries(QUERY_CONFIGS).map(([key, config]) => ({
    key,
    config,
    queryType: key as keyof typeof QUERY_CONFIGS,
    customAmount: customAmounts[key] || "0.002",
    setCustomAmount: (value: string) => setCustomAmounts(prev => ({ ...prev, [key]: value })),
    isExpanded: expandedSections[key] || false,
    toggleExpanded: () => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }))

  return (
    <div className="h-screen bg-[#0E0F16] flex flex-col">
      <div className="flex-1 flex p-4 md:p-6 gap-4 md:gap-6 max-h-[calc(100vh-32px)] md:max-h-[calc(100vh-48px)]">
        {/* Left Panel - Test Buttons */}
        <div className="w-[500px] shrink-0 flex flex-col max-h-full bg-[#12121B] rounded-2xl md:rounded-3xl border border-white/[0.07]">
          <div className="p-4 md:p-6 border-b border-white/[0.07]">
            <PoolSelect
              coinType={coinType}
              maturity={maturity}
              onChange={(coinAddress, maturityValue) => {
                setCoinType(coinAddress)
                setMaturity(maturityValue)
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {queryButtons.map(button => (
              <QueryButton
                key={button.key}
                config={button.config}
                queryType={button.queryType}
                coinConfig={coinConfig}
                address={address}
                customAmount={button.customAmount}
                setCustomAmount={button.setCustomAmount}
                isExpanded={button.isExpanded}
                toggleExpanded={button.toggleExpanded}
                onQuery={(callInfo) => setCalls(prev => [callInfo, ...prev])}
                calls={calls}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col max-h-full bg-[#12121B] rounded-2xl md:rounded-3xl border border-white/[0.07]">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.07]">
            <div className="text-base font-medium text-white/90">Test Results</div>
            <button
              onClick={() => setCalls([])}
              className={`flex items-center gap-2 px-3 h-8 text-sm text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ${!coinConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!coinConfig}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                {coinType && !coinConfig ? (
                  <>
                    <div className="w-12 h-12 mb-4 rounded-full bg-white/5 animate-pulse"></div>
                    <div className="h-5 w-32 bg-white/5 rounded animate-pulse"></div>
                  </>
                ) : !coinConfig ? (
                  <>
                    <svg className="w-12 h-12 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M18 8h1a4 4 0 110 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M6 1v3M10 1v3M14 1v3" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M18 11.5s1.5-1 1.5-2-1.5-2-1.5-2" />
                    </svg>
                    <div className="text-sm">Select a pool to start</div>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M18 8h1a4 4 0 110 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M6 1v3M10 1v3M14 1v3" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M18 11.5s1.5-1 1.5-2-1.5-2-1.5-2" />
                    </svg>
                    <div className="text-sm">Click button to start testing</div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Contract Calls with Results */}
                {calls.map((call, index) => (
                  <div 
                    key={call.timestamp} 
                    className={`bg-black/20 rounded-xl p-3 md:p-4 text-sm md:text-base space-y-4 transition-all duration-500 ${
                      index === 0 && !call.result ? 'animate-slide-in' : ''
                    }`}
                  >
                    {/* Contract Call */}
                    <div>
                      <div className="text-white/90 font-medium mb-2">Contract Call</div>
                      <div className="font-mono text-xs">
                        <div className="grid grid-cols-[160px,1fr] gap-2 mb-2">
                          <span className="text-white/40">Call:</span>
                          <div className="text-white/80 break-all">
                            {call.name}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(call.moveCall.arguments).map(([key, value], index) => {
                            const paramNames = [
                              "input_amount",
                              "min_max_amount",
                              "priceVoucher",
                              "py_state_id",
                              "market_factory_config_id",
                              "market_state_id",
                              "clock",
                            ]
                            return (
                              <div key={key} className="grid grid-cols-[160px,1fr] gap-2 items-start">
                                <span className="text-white/40 break-all">{paramNames[index]}:</span>
                                <div className="text-white/80 break-all flex items-center gap-2">
                                  <span className="break-all">{value}</span>
                                  <button
                                    onClick={() => handleCopy(String(value), `${call.timestamp}-${key}`)}
                                    className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-white/5 hover:bg-white/10 ml-auto"
                                  >
                                    {copiedField === `${call.timestamp}-${key}` ? (
                                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                          <div className="grid grid-cols-[160px,1fr] gap-2 items-start">
                            <span className="text-white/40 break-all">type_arguments:</span>
                            <div className="text-white/80 break-all flex items-center gap-2">
                              <span className="break-all">{call.moveCall.typeArguments.join(', ')}</span>
                              <button
                                onClick={() => handleCopy(call.moveCall.typeArguments.join(', '), `${call.timestamp}-type_arguments`)}
                                className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-white/5 hover:bg-white/10 ml-auto"
                              >
                                {copiedField === `${call.timestamp}-type_arguments` ? (
                                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Result */}
                    {call.result && (
                      <div className="animate-fade-in">
                        <div className="text-white/90 font-medium mb-2">Result</div>
                        <div className="text-white/80 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-white/60">Input:</span>
                            <span className="text-right">{call.result.input} ({call.result.coinName})</span>
                          </div>
                          {call.result.error ? (
                            <div className="text-red-500 break-all whitespace-pre-wrap animate-fade-in">
                              Error: {call.result.error}
                            </div>
                          ) : (
                            <div className="animate-fade-in space-y-2">
                              <div className="flex justify-between">
                                <span className="text-white/60">Output:</span>
                                <span className="text-right">{call.result.output} ({call.result.coinName})</span>
                              </div>
                              <div className="flex justify-between text-xs text-white/40">
                                <span>Raw Output:</span>
                                <span className="text-right break-all">{call.result.rawOutput}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Loading States */}
                    {status === 'pending' && (
                      <div className="animate-fade-in">
                        <div className="text-white/90 font-medium mb-2">Result</div>
                        <div className="text-white/60">Loading...</div>
                      </div>
                    )}
                  </div>
                ))}
              </>
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
