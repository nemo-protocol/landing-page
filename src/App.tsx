import { Suspense, lazy } from "react";
import Learn from "./pages/Learn/Index";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./App.css";

const Home = lazy(() => import("./pages/Home/Index"));
const Market = lazy(() => import("./pages/Market/Index"));
const Detail = lazy(() => import("./pages/Market/Detail/Index"));

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div className="h-[100%]">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market" element={<Market />} />
          <Route path="/market/detail" element={<Detail />} />
          <Route path="/learn" element={<Learn />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
