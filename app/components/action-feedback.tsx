'use client'

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react'

type FeedbackNotice = {
  id: string
  message: string
  error: boolean
}

type FeedbackContextValue = {
  publish: (notice: FeedbackNotice) => void
  dismiss: (id: string) => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<FeedbackNotice[]>([])
  const publish = useCallback((notice: FeedbackNotice) => {
    setNotices((current) => [...current.filter((item) => item.id !== notice.id), notice])
  }, [])
  const dismiss = useCallback((id: string) => {
    setNotices((current) => current.filter((item) => item.id !== id))
  }, [])

  return (
    <FeedbackContext.Provider value={{ publish, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-end gap-2 px-4 sm:left-auto sm:right-4 sm:w-[min(24rem,calc(100vw-2rem))] sm:px-0">
        {notices.map((notice) => (
          <div key={notice.id} role={notice.error ? 'alert' : 'status'} className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-4 text-sm leading-5 shadow-[0_12px_36px_rgba(23,25,24,.14)] ${notice.error ? 'border-[#F0D1CD] text-[#8B322B]' : 'border-[#CDE8D9] text-[#176B4C]'}`}>
            <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${notice.error ? 'bg-[#F8E6E3]' : 'bg-[#DDF2E5]'}`}>{notice.error ? '!' : '✓'}</span>
            <p className="min-w-0 flex-1">{notice.message}</p>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(notice.id)} className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-[#687873] hover:bg-[#F3F6F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16835D]">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

export function ActionFeedback({ message, error = false, signal }: { message?: string; error?: boolean; signal?: object }) {
  const context = useContext(FeedbackContext)
  const id = useId()
  const publish = context?.publish
  const dismiss = context?.dismiss
  useEffect(() => {
    if (!publish || !dismiss) return
    if (message) publish({ id, message, error })
    else dismiss(id)
  }, [dismiss, error, id, message, publish, signal])

  if (!context) throw new Error('ActionFeedback must be rendered inside ActionFeedbackProvider.')

  return null
}
