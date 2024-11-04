// ToastProvider.tsx
import ToastComponent from "./Toast";
import React, { createContext, useState, ReactNode } from "react";
import {
  Toast,
  ToastType,
  ToastContextType,
  DEFAULT_DURATION,
} from "./toastTypes";

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (
    message: string,
    type: ToastType = "info",
    duration: number = DEFAULT_DURATION,
  ) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const toast: ToastContextType = {
    success: (message, duration) => addToast(message, "success", duration),
    info: (message, duration) => addToast(message, "info", duration),
    warn: (message, duration) => addToast(message, "warn", duration),
    error: (message, duration) => addToast(message, "error", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      <div className="toast toast-center toast-top z-20">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} {...toast} />
        ))}
      </div>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
