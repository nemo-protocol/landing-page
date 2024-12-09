import React from "react"
import App from "./App.tsx"
import { network } from "./config"
import ReactDOM from "react-dom/client"
import { Toaster } from "@/components/ui/toaster"
import { ToastProvider } from "@/components/Toast"
import { getFullnodeUrl } from "@mysten/sui/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  // WalletProvider,
  SuiClientProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit"
import "@mysten/dapp-kit/dist/index.css"
import "./index.css"
import { AnimatePresence } from "framer-motion"
import { WalletProvider } from "@aricredemption/wallet-kit"
import '@aricredemption/wallet-kit/style.css';
const queryClient = new QueryClient()
const { networkConfig } = createNetworkConfig({
  // TODO: support muilt rpc
  // mainnet: { url: "https://sui-mainnet-endpoint.blockvision.org" },
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toaster />
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
        <WalletProvider>
          <ToastProvider>
            <AnimatePresence>
              <App />
            </AnimatePresence>
          </ToastProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
