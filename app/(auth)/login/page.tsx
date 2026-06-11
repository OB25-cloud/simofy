'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null)

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span
          className="text-3xl font-bold tracking-[0.3em]"
          style={{ color: '#B8922A' }}
        >
          SIMOFY
        </span>
        <p className="mt-2 text-sm text-gray-400">Queenstown, NZ — Landscaping CRM</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-8 py-8">
        <h1 className="text-base font-semibold text-gray-900 mb-6">Sign in to your account</h1>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
            style={{ background: '#B8922A' }}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs text-gray-400">
        Contact your administrator to reset your password.
      </p>
    </div>
  )
}
