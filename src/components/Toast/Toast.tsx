// Toast.tsx
import React, { useEffect, useRef } from "react"
import { DEFAULT_DURATION, Toast as ToastType } from "./toastTypes"
import "./index.css"

const Toast: React.FC<ToastType> = ({ type, message }) => {
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (toastRef.current) {
      toastRef.current.classList.add("show")
      setTimeout(() => {
        toastRef.current?.classList.remove("show")
        toastRef.current?.classList.add("hidden")
      }, DEFAULT_DURATION - 500)
    }
  }, [])
  let className = "alert "
  switch (type) {
    case "info":
      className += "alert-info"
      break
    case "success":
      className += "alert-success"
      break
    case "warn":
      className += "alert-warning"
      break
    case "error":
      className += "alert-error"
      break
    default:
      className += "alert-info"
  }

  return (
    <div ref={toastRef} className={className}>
      <span>{message}</span>
    </div>
  )
}

export default Toast
