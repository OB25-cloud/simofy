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
      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm transition-colors duration-150 disabled:opacity-50 text-[#9CA3AF] hover:text-white hover:bg-[#2A2A3E]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
