import { create } from 'zustand'

interface DialogState {
  open: boolean
  status?: 'Success' | 'Failed'
  network?: string
  txId: string
  message?: string
  onClose?: () => void
  showDialog: (params: Omit<DialogState, 'showDialog' | 'hideDialog' | 'open'>) => void
  hideDialog: () => void
}

export const useDialogStore = create<DialogState>((set) => ({
  open: false,
  txId: '',
  showDialog: (params) => set({ ...params, open: true }),
  hideDialog: () => set({ open: false, txId: '' })
}))

export const showTransactionDialog = (params: {
  status?: 'Success' | 'Failed'
  network?: string
  txId: string
  message?: string
  onClose?: () => void
}) => {
  useDialogStore.getState().showDialog(params)
} 