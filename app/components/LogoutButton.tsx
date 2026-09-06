'use client'

import { useState } from 'react'

export default function LogoutButton() {
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className="flex items-center w-full px-4 py-[7px] rounded-lg text-[14px] font-semibold tracking-[0.02em] transition-colors duration-150 disabled:opacity-50 text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-hover)]"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
