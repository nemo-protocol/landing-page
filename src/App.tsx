import { Suspense, lazy } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import "./App.css";

const Home = lazy(() => import("./pages/Home"));

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
