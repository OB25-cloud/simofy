'use client'

import { useState } from 'react'
import { MODULES, ACTIONS, ROLE_DEFAULTS, buildPermissionMap } from '@/lib/permissions'
import type { Module, Action, PermissionRow, PermissionMap } from '@/lib/permissions'

type UserRow = {
  id: string
  email: string
  role: string
  name: string | null
  permissions: PermissionRow[]
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', clients: 'Clients', jobs: 'Jobs', schedule: 'Schedule',
  quotes: 'Quotes', invoices: 'Invoices', staff: 'Staff', leads: 'Leads', settings: 'Settings',
}

const ACTION_LABELS: Record<string, string> = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', manage: 'Manage',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', supervisor: 'Supervisor', field: 'Field Staff',
}

const ROLES = ['admin', 'supervisor', 'field'] as const

function roleBadgeStyle(role: string) {
  if (role === 'admin')      return { background: 'rgba(184,146,42,0.12)', color: '#B8922A' }
  if (role === 'supervisor') return { background: '#eff6ff', color: '#1d4ed8' }
  return { background: '#f3f4f6', color: '#6b7280' }
}

export default function UsersView({
  users: initialUsers,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [permMap, setPermMap] = useState<PermissionMap | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [roleChanging, setRoleChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'supervisor' | 'field'>('supervisor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const selectedUser = users.find(u => u.id === selectedId) ?? null

  function selectUser(user: UserRow) {
    setSelectedId(user.id)
    setError(null)
    setIsDirty(false)
    setSaveSuccess(false)
    if (user.role === 'admin') {
      setPermMap(null)
    } else if (user.permissions.length > 0) {
      setPermMap(buildPermissionMap(user.permissions))
    } else {
      setPermMap({ ...(ROLE_DEFAULTS[user.role] ?? ROLE_DEFAULTS.field) })
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setRoleChanging(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) throw new Error(await res.text())
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setIsDirty(false)
      if (newRole === 'admin') {
        setPermMap(null)
      } else {
        setPermMap({ ...(ROLE_DEFAULTS[newRole] ?? ROLE_DEFAULTS.field) })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setRoleChanging(false)
    }
  }

  function handlePermissionToggle(module: Module, action: Action, enabled: boolean) {
    setPermMap(prev => prev ? { ...prev, [module]: { ...prev[module], [action]: enabled } } : prev)
    setIsDirty(true)
    setSaveSuccess(false)
  }

  async function handleSavePermissions() {
    if (!selectedUser || !permMap) return
    setSaving(true)
    setError(null)

    const permissions = MODULES.flatMap(module =>
      ACTIONS.map(action => ({ module, action, enabled: permMap[module][action] }))
    )

    try {
      const res = await fetch('/api/admin/update-permissions-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, permissions }),
      })
      if (!res.ok) throw new Error(await res.text())
      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  function closeInviteModal() {
    setShowInvite(false)
    setInviteError(null)
    setInviteSuccess(false)
    setInviteEmail('')
    setInviteRole('supervisor')
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) throw new Error(await res.text())
      setInviteSuccess(true)
      setTimeout(closeInviteModal, 2500)
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) closeInviteModal() }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Invite User</h2>
              <button
                onClick={closeInviteModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-2" style={{ color: '#16a34a' }}>✓</p>
                <p className="text-sm font-medium text-gray-700">Invite sent to {inviteEmail}</p>
                <p className="text-xs text-gray-400 mt-1">They will receive a link to set their password.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:border-[#B8922A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'supervisor' | 'field')}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#B8922A]"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="field">Field Staff</option>
                  </select>
                </div>

                {inviteError && (
                  <div className="px-3 py-2 rounded-md text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    {inviteError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
                    style={{ background: '#B8922A' }}
                  >
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setShowInvite(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-md"
            style={{ background: '#B8922A' }}
          >
            <span className="text-base leading-none font-bold">+</span>
            Invite User
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.map(user => {
            const initials = (user.name ?? user.email).slice(0, 2).toUpperCase()
            const isSelected = user.id === selectedId
            return (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-50"
                style={{
                  background:  isSelected ? 'rgba(184,146,42,0.04)' : 'transparent',
                  borderLeft:  isSelected ? '3px solid #B8922A'     : '3px solid transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: '#B8922A' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={roleBadgeStyle(user.role)}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedUser ? (
        <div className="flex-1 overflow-y-auto p-6">
          {/* User header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: '#B8922A' }}
            >
              {(selectedUser.name ?? selectedUser.email).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedUser.name ?? '—'}</p>
              <p className="text-sm text-gray-400">{selectedUser.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Role */}
          <div className="mb-7">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Role</label>
            <div className="flex items-center gap-3">
              <select
                value={selectedUser.role}
                onChange={e => handleRoleChange(selectedUser.id, e.target.value)}
                disabled={roleChanging || selectedUser.id === currentUserId || selectedUser.role === 'admin'}
                className="px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              {roleChanging && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
            {selectedUser.id === currentUserId && (
              <p className="text-xs text-gray-400 mt-1.5">You cannot change your own role.</p>
            )}
            {selectedUser.role === 'admin' && selectedUser.id !== currentUserId && (
              <p className="text-xs text-gray-400 mt-1.5">Admin roles cannot be changed.</p>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Permissions
            </label>

            {selectedUser.role === 'admin' ? (
              <div
                className="rounded-lg border px-5 py-4 flex items-center gap-3"
                style={{ background: 'rgba(184,146,42,0.04)', borderColor: 'rgba(184,146,42,0.2)' }}
              >
                <span className="text-sm font-semibold" style={{ color: '#B8922A' }}>Full Access</span>
                <span className="text-xs text-gray-400">— Admins have unrestricted access to all modules</span>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider w-32">
                          Module
                        </th>
                        {ACTIONS.map(a => (
                          <th key={a} className="text-center px-2 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((module, i) => (
                        <tr key={module} style={{ borderTop: i === 0 ? undefined : '1px solid #f9fafb' }}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700">
                            {MODULE_LABELS[module]}
                          </td>
                          {ACTIONS.map(action => (
                            <td key={action} className="px-2 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={permMap?.[module]?.[action] ?? false}
                                onChange={e => handlePermissionToggle(module, action, e.target.checked)}
                                className="w-4 h-4 rounded cursor-pointer"
                                style={{ accentColor: '#B8922A' }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  {saveSuccess && (
                    <span className="text-sm font-medium" style={{ color: '#16a34a' }}>
                      Permissions saved
                    </span>
                  )}
                  <button
                    onClick={handleSavePermissions}
                    disabled={!isDirty || saving}
                    className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#B8922A' }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-300">Select a user to manage their permissions</p>
        </div>
      )}
    </div>
  )
}
