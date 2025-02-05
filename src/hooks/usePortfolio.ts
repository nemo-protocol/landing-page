import { create } from "zustand"
import Decimal from "decimal.js"

interface Portfolio {
  key: string
  balance: number
  reward: number
}

interface PortfolioState {
  portfolios: Portfolio[]
  updatePortfolio: (key: string, balance: number, reward: number) => void
  clearPortfolios: () => void
}

// Configure Decimal for consistent precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN })

const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolios: [],
  updatePortfolio: (key, balance, reward) =>
    set((state) => {
      const portfolioExists = state.portfolios.some(
        (portfolio) => portfolio.key === key,
      )

      // Ensure balance and reward are valid numbers and convert to string for Decimal
      const safeBalance = isNaN(balance) ? "0" : balance.toString()
      const safeReward = isNaN(reward) ? "0" : reward.toString()

      if (portfolioExists) {
        return {
          portfolios: state.portfolios.map((portfolio) =>
            portfolio.key === key
              ? {
                  key,
                  balance: new Decimal(safeBalance).toNumber(),
                  reward: new Decimal(safeReward).toNumber(),
                }
              : portfolio,
          ),
        }
      } else {
        return {
          portfolios: [...state.portfolios, { 
            key, 
            balance: new Decimal(safeBalance).toNumber(),
            reward: new Decimal(safeReward).toNumber(),
          }],
        }
      }
    }),
  clearPortfolios: () => set({ portfolios: [] }),
}))

export default usePortfolioStore
