import path from "path"
import svgr from "vite-plugin-svgr"
import { defineConfig, loadEnv, ServerOptions } from "vite"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const serverConfig: ServerOptions = {
    proxy: {
      // Proxy for Sui RPC endpoints to solve CORS issues
      '/sui-mainnet': {
        target: 'https://rpc.mainnet.sui.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-mainnet/, ''),
      },
      '/sui-testnet': {
        target: 'https://rpc.testnet.sui.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-testnet/, ''),
      },
    }
  }

  if (env.VITE_API_URL) {
    serverConfig.proxy = {
      ...serverConfig.proxy,
      "/api": {
        target: env.VITE_API_URL,
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api/, ""),
      },
    }
  }

  if (env.VITE_PORT) {
    serverConfig.port = parseInt(env.VITE_PORT)
  }

  return {
    plugins: [react(), svgr()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer",
      },
    },
    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
    server: serverConfig,
  }
})
