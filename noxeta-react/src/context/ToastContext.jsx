import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, title: '', msg: '' })

  const showToast = useCallback((title, msg = '', duration = 3200) => {
    setToast({ visible: true, title, msg })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), duration)
  }, [])

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
