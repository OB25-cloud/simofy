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
  if (role === 'admin')      return { background: 'rgba(21, 128, 61,0.12)', color: 'var(--accent)' }
  if (role === 'supervisor') return { background: '#DBEAFE', color: '#1D4ED8' }
  return { background: 'var(--surface-muted)', color: 'var(--ink-muted)' }
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

  // Delete user
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedUser = users.find(u => u.id === selectedId) ?? null

  function selectUser(user: UserRow) {
    setSelectedId(user.id)
    setError(null)
    setIsDirty(false)
    setSaveSuccess(false)
    setShowDeleteConfirm(false)
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

  async function handleDeleteUser() {
    if (!selectedUser) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
      setSelectedId(null)
      setPermMap(null)
      setShowDeleteConfirm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Delete confirmation modal */}
      {showDeleteConfirm && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-ink mb-2">Delete user?</h2>
            <p className="text-sm text-ink-muted mb-1">
              Are you sure you want to delete <span className="font-medium text-ink-muted">{selectedUser.name ?? selectedUser.email}</span>?
            </p>
            <p className="text-sm text-[#EF4444] mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-3 sm:py-2 text-sm text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-md transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User list — hidden on mobile once a user is selected, so the detail
          panel gets the full screen instead of being squeezed beside a
          fixed-width list */}
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 border-r border-line flex-col`}>
        <div className="flex-1 overflow-y-auto">
          {users.map(user => {
            const initials = (user.name ?? user.email).slice(0, 2).toUpperCase()
            const isSelected = user.id === selectedId
            return (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-line-soft"
                style={{
                  background:  isSelected ? 'rgba(21, 128, 61,0.04)' : 'transparent',
                  borderLeft:  isSelected ? '3px solid var(--accent)'     : '3px solid transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{user.name ?? '—'}</p>
                  <p className="text-xs text-ink-muted truncate">{user.email}</p>
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
          <button
            onClick={() => { setSelectedId(null); setPermMap(null) }}
            className="md:hidden -ml-2 mb-4 flex items-center gap-1.5 px-2 py-3 text-sm font-medium text-ink-muted hover:text-ink"
          >
            ← Back to users
          </button>
          {/* User header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {(selectedUser.name ?? selectedUser.email).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-ink">{selectedUser.name ?? '—'}</p>
              <p className="text-sm text-ink-muted">{selectedUser.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md text-sm bg-red-50 text-[#EF4444]">
              {error}
            </div>
          )}

          {/* Role */}
          <div className="mb-7">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Role</label>
            <div className="flex items-center gap-3">
              <select
                value={selectedUser.role}
                onChange={e => handleRoleChange(selectedUser.id, e.target.value)}
                disabled={roleChanging || selectedUser.id === currentUserId || selectedUser.role === 'admin'}
                className="px-3 py-2 rounded-md border border-line text-sm font-medium text-ink bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              {roleChanging && <span className="text-xs text-ink-muted">Saving…</span>}
            </div>
            {selectedUser.id === currentUserId && (
              <p className="text-xs text-ink-muted mt-1.5">You cannot change your own role.</p>
            )}
            {selectedUser.role === 'admin' && selectedUser.id !== currentUserId && (
              <p className="text-xs text-ink-muted mt-1.5">Admin roles cannot be changed.</p>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
              Permissions
            </label>

            {selectedUser.role === 'admin' ? (
              <div
                className="rounded-lg border px-5 py-4 flex items-center gap-3"
                style={{ background: 'rgba(21, 128, 61,0.04)', borderColor: 'rgba(21, 128, 61,0.2)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Full Access</span>
                <span className="text-xs text-ink-muted">— Admins have unrestricted access to all modules</span>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-ink-muted uppercase tracking-wider w-32 bg-surface-muted">
                          Module
                        </th>
                        {ACTIONS.map(a => (
                          <th key={a} className="text-center px-2 py-2.5 text-xs font-bold text-ink-muted uppercase tracking-wider bg-surface-muted">
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map(module => (
                        <tr key={module} className="border-t border-line-soft">
                          <td className="px-4 py-3 text-sm font-medium text-ink-muted">
                            {MODULE_LABELS[module]}
                          </td>
                          {ACTIONS.map(action => (
                            <td key={action} className="px-2 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={permMap?.[module]?.[action] ?? false}
                                onChange={e => handlePermissionToggle(module, action, e.target.checked)}
                                className="w-4 h-4 rounded cursor-pointer"
                                style={{ accentColor: 'var(--accent)' }}
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
                    <span className="text-sm font-medium" style={{ color: '#22C55E' }}>
                      Permissions saved
                    </span>
                  )}
                  <button
                    onClick={handleSavePermissions}
                    disabled={!isDirty || saving}
                    className="px-4 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--accent)' }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Secondary actions */}
          {selectedUser.role !== 'admin' && selectedUser.id !== currentUserId && (
            <div className="mt-8 pt-6 border-t border-line flex items-center justify-end">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm font-medium text-[#EF4444] hover:text-red-700"
              >
                Delete User
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-300">Select a user to manage their permissions</p>
        </div>
      )}
    </div>
  )
}
