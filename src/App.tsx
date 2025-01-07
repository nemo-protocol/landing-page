import { Suspense, lazy } from "react"
import { HashRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import Loading from "@/components/Loading"

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
              <Route path="/Rewards" element={<Rewards />} />
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
