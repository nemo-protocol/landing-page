import path from "path"
import svgr from "vite-plugin-svgr"
import { defineConfig, loadEnv, ServerOptions } from "vite"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const serverConfig: ServerOptions = {}
  
  // Initialize proxy object
  serverConfig.proxy = {}

  if (env.VITE_API_URL) {
    serverConfig.proxy["/api"] = {
      target: env.VITE_API_URL,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api/, ""),
    }
  }
  
  // Add proxy for Cetus fullNode URL
  serverConfig.proxy["/sui-api"] = {
    target: "https://go.getblock.io",
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/sui-api/, "/6d20eb75d5814832982d365cd2356f57"),
    headers: {
      'Content-Type': 'application/json',
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
