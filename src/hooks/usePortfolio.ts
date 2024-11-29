import { create } from "zustand"

interface Portfolio {
  key: string
  balance: number
  reward: number
}

interface PortfolioState {
  portfolios: Portfolio[]
  updatePortfolio: (key: string, balance: number, reward: number) => void
}

const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolios: [],
  updatePortfolio: (key, balance, reward) =>
    set((state) => {
      const portfolioExists = state.portfolios.some(
        (portfolio) => portfolio.key === key,
      )

      if (portfolioExists) {
        return {
          portfolios: state.portfolios.map((portfolio) =>
            portfolio.key === key
              ? {
                  key,
                  balance,
                  reward,
                }
              : portfolio,
          ),
        }
      } else {
        return {
          portfolios: [...state.portfolios, { key, balance, reward }],
        }
      }
    }),
}))

export default usePortfolioStore
