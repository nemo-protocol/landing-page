// toastTypes.ts
export type ToastType = "info" | "success" | "warn" | "error";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warn: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

export const DEFAULT_DURATION = 2000;
