'use client'

import type { FormEvent, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

type ConfirmedFormProps = {
  action: (formData: FormData) => void | Promise<void>
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  className?: string
  children: ReactNode
}

export function ConfirmedForm({ action, title, description, confirmLabel, destructive = false, className, children }: ConfirmedFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const approvedSubmit = useRef(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function interceptSubmit(event: FormEvent<HTMLFormElement>) {
    if (approvedSubmit.current) {
      approvedSubmit.current = false
      return
    }
    event.preventDefault()
    formRef.current = event.currentTarget
    setOpen(true)
  }

  function confirm() {
    const form = formRef.current
    if (!form) return
    formRef.current = null
    approvedSubmit.current = true
    setOpen(false)
    form.requestSubmit()
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={interceptSubmit} className={className}>
        {children}
      </form>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); setOpen(false); formRef.current = null }}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-[#E7EBE8] bg-white p-0 text-[#171918] shadow-[0_24px_80px_rgba(23,25,24,.2)] backdrop:bg-[#171918]/40"
      >
        <div className="p-5 sm:p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-[#F1F5F2] text-[#16835D]" aria-hidden="true">✓</div>
          <h2 id={titleId} className="mt-4 text-lg font-semibold">{title}</h2>
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#687873]">{description}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setOpen(false); formRef.current = null }} className="min-h-11 rounded-lg border border-[#DCE5E1] px-4 text-sm font-medium hover:bg-[#F7F8F7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16835D]/20">Go back</button>
            <button type="button" onClick={confirm} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 ${destructive ? 'bg-[#9B3028] hover:bg-[#812820] focus-visible:ring-[#B5473D]/20' : 'bg-[#171918] hover:bg-black focus-visible:ring-[#16835D]/20'}`}>{confirmLabel}</button>
          </div>
        </div>
      </dialog>
    </>
  )
}
