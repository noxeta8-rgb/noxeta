import { useToast } from '../../context/ToastContext'

export default function Toast() {
  const { toast } = useToast()
  if (!toast.visible) return null
  return (
    <div className="toast">
      <div className="toast-title">{toast.title}</div>
      <div className="toast-msg">{toast.msg}</div>
    </div>
  )
}
