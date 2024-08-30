import React from "react"
import App from "./App.tsx"
import ReactDOM from "react-dom/client"
import { Toaster } from "@/components/ui/toaster"
import { getFullnodeUrl } from "@mysten/sui/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit"

import "./index.css"
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient()
const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toaster />
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
