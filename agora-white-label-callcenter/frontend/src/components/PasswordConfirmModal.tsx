import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { verifyHighRiskPassword } from '../lib/security'

interface PasswordConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function PasswordConfirmModal({
  open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  function handleClose() {
    setPassword('')
    setError('')
    onCancel()
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!verifyHighRiskPassword(password)) {
      setError('Incorrect password. This action requires confirmation.')
      return
    }
    setPassword('')
    setError('')
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleConfirm} className="px-5 py-4 space-y-3">
          {description && <p className="text-sm text-gray-600">{description}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Confirmation Password</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Enter password to continue"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
