import { Suspense, lazy } from "react"
import Learn from "./pages/Learn/Index"
import { HashRouter, Route, Routes } from "react-router-dom"
import "./App.css"
import { IS_DEV } from "./config"

const Home = lazy(() => import("./pages/Home/Index"))
const Test = lazy(() => import("./pages/Test/Index"))
const Market = lazy(() => import("./pages/Market/Index"))
const Portfolio = lazy(() => import("./pages/Portfolio/Index"))
const Detail = lazy(() => import("./pages/Market/Detail/Index"))
const FixedReturn = lazy(() => import("./pages/FixedReturn/Index"))

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div className="h-[100%]">Loading...</div>}>
        <div className="min-h-screen xl:max-w-[1200px] xl:mx-auto w-full px-7.5 xl:px-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fixed-return" element={<FixedReturn />} />
            <Route path="/market" element={<Market />} />
            <Route path="/market/detail" element={<Detail />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/portfolio" element={<Portfolio />} />
            {IS_DEV && <Route path="/test" element={<Test />} />}
          </Routes>
        </div>
      </Suspense>
    </HashRouter>
  )
}

export default App
