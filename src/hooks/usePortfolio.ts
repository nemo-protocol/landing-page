import { useState, useCallback } from "react"

interface Portfolio {
  key: string
  balance: number
  reward: number
}

const usePortfolio = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])

  const updatePortfolio = useCallback(
    (key: string, balance: number, reward: number) => {
      setPortfolios((prevPortfolios) => {
        const existingPortfolio = prevPortfolios.find(
          (portfolio) => portfolio.key === key,
        )

        if (existingPortfolio) {
          return prevPortfolios.map((portfolio) =>
            portfolio.key === key
              ? {
                  ...portfolio,
                  balance: portfolio.balance + balance,
                  reward: portfolio.reward + reward,
                }
              : portfolio,
          )
        } else {
          return [...prevPortfolios, { key, balance, reward }]
        }
      })
    },
    [],
  )

  return {
    portfolios,
    updatePortfolio,
  }
}

export default usePortfolio
