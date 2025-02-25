import { Suspense, lazy, useEffect, useState } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import Loading from "@/components/Loading"
import { motion } from "framer-motion"

interface CountryResponse {
  ip: string
  country: string
}

const Home = lazy(() => import("./pages/Home/Index"))
const Test = lazy(() => import("./pages/Test/Index"))
const Learn = lazy(() => import("./pages/Learn/Index"))
const Rewards = lazy(() => import("./pages/Rewards/Index"))
const Market = lazy(() => import("./pages/Market/Index"))
const Mint = lazy(() => import("./pages/Mint/Index"))
const Portfolio = lazy(() => import("./pages/Portfolio/Index"))
const Detail = lazy(() => import("./pages/Market/Detail/Index"))
const FixedReturn = lazy(() => import("./pages/FixedReturn/Index"))
const WalletKit = lazy(() => import("./pages/WalletKit"))

function App() {
  const [isBlocked, setIsBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkCountry = async () => {
      try {
        const response = await fetch("https://api.country.is/")
        const data: CountryResponse = await response.json()
        const restrictedRegions = import.meta.env.VITE_RESTRICTED_REGIONS?.split(",") || []
        if (restrictedRegions.includes(data.country)) {
          setIsBlocked(true)
        }
      } catch (error) {
        console.error("Failed to check country:", error)
        setError("Unable to verify your region. Please try again later.")
      }
    }

    checkCountry()
  }, [])

  if (isBlocked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#08080C]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mx-4"
        >
          <div className="text-center p-8 bg-[#0E0F16] rounded-3xl border border-white/10">
            <div className="mb-6">
              <div className="size-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                  className="size-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isBlocked ? "Access Restricted" : "System Error"}
              </h1>
              <p className="text-white/60">
                {isBlocked
                  ? "Sorry, this service is not available in your region."
                  : error}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Suspense fallback={<Loading className="h-screen" />}>
        <div className="relative">
          <div className="min-h-screen w-full bg-transparent">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fixed-return" element={<FixedReturn />} />
              <Route path="/market" element={<Market />} />
              <Route path="/mint/:action?" element={<Mint />} />
              <Route
                element={<Detail />}
                path="/market/detail/:coinType/:maturity/:operation?/:tokenType?"
              />
              <Route path="/learn" element={<Learn />} />
              <Route path="/points" element={<Rewards />} />
              <Route path="/portfolio/:type?" element={<Portfolio />} />
              <Route path="/wallet-kit" element={<WalletKit />} />
              <Route path="/test" element={<Test />} />
            </Routes>
          </div>
        </div>
      </Suspense>
    </HashRouter>
  )
}

export default App
