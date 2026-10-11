import { createContext, useContext, useState, useRef, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    isPrompt: false,
    promptDefaultValue: '',
    promptPlaceholder: '',
  })

  const resolverRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setModalState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'primary',
        isPrompt: false,
        promptDefaultValue: '',
        promptPlaceholder: '',
      })
    })
  }, [])

  const prompt = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setModalState({
        isOpen: true,
        title: options.title || 'Please enter details',
        message: options.message || '',
        confirmText: options.confirmText || 'Submit',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'primary',
        isPrompt: true,
        promptDefaultValue: options.defaultValue || '',
        promptPlaceholder: options.placeholder || 'Type here...',
      })
    })
  }, [])

  const handleConfirm = useCallback((result) => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }, [])

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
    if (resolverRef.current) {
      resolverRef.current(modalState.isPrompt ? null : false)
      resolverRef.current = null
    }
  }, [modalState.isPrompt])

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        isPrompt={modalState.isPrompt}
        promptDefaultValue={modalState.promptDefaultValue}
        promptPlaceholder={modalState.promptPlaceholder}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
