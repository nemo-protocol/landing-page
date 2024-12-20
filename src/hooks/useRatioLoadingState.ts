import { useState, useEffect, useRef } from "react"

interface LoadingState {
  isLoading: boolean
  setIsLoading: (value: boolean) => void
}

export function useRatioLoadingState(isFetching: boolean): LoadingState {
  const timerRef = useRef<NodeJS.Timeout>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isFetching) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      setIsLoading(true)
    } else {
      timerRef.current = setTimeout(() => {
        setIsLoading(false)
      }, 500)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isFetching])

  return { isLoading, setIsLoading }
}
