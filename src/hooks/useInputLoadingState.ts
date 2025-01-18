import { useState, useEffect, useRef } from "react"

interface LoadingState {
  isLoading: boolean
  setIsLoading: (value: boolean) => void
}

export default function useLoadingState(
  value: string,
  isFetching: boolean,
): LoadingState {
  const timerRef = useRef<NodeJS.Timeout>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setIsLoading(true)

    timerRef.current = setTimeout(() => {
      if (!isFetching) {
        setIsLoading(false)
        return
      }
    }, 500)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, isFetching])

  return { isLoading, setIsLoading }
}
