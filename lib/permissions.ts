export const MODULES = [
  'dashboard', 'clients', 'jobs', 'schedule',
  'quotes', 'invoices', 'staff', 'leads', 'settings',
] as const

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'manage'] as const

export type Module = (typeof MODULES)[number]
export type Action = (typeof ACTIONS)[number]

export type PermissionRow = { module: string; action: string; enabled: boolean }
export type PermissionMap = Record<Module, Record<Action, boolean>>

const ALL_OFF: Record<Action, boolean> = { view: false, create: false, edit: false, delete: false, manage: false }
const ALL_ON:  Record<Action, boolean> = { view: true,  create: true,  edit: true,  delete: true,  manage: true  }
const VIEW_CREATE_EDIT: Record<Action, boolean> = { view: true, create: true, edit: true, delete: false, manage: false }
const VIEW_ONLY: Record<Action, boolean> = { view: true, create: false, edit: false, delete: false, manage: false }
const VIEW_EDIT: Record<Action, boolean> = { view: true, create: false, edit: true, delete: false, manage: false }

export const ROLE_DEFAULTS: Record<string, PermissionMap> = {
  admin: Object.fromEntries(MODULES.map(m => [m, { ...ALL_ON }])) as PermissionMap,
  supervisor: {
    dashboard: { ...VIEW_ONLY },
    clients:   { ...VIEW_CREATE_EDIT },
    jobs:      { ...VIEW_CREATE_EDIT },
    schedule:  { ...VIEW_CREATE_EDIT },
    quotes:    { ...VIEW_CREATE_EDIT },
    invoices:  { ...VIEW_CREATE_EDIT },
    staff:     { ...VIEW_ONLY },
    leads:     { ...VIEW_CREATE_EDIT },
    settings:  { ...ALL_OFF },
  },
  field: {
    dashboard: { ...ALL_OFF },
    clients:   { ...ALL_OFF },
    jobs:      { ...VIEW_EDIT },
    schedule:  { ...VIEW_ONLY },
    quotes:    { ...ALL_OFF },
    invoices:  { ...ALL_OFF },
    staff:     { ...ALL_OFF },
    leads:     { ...ALL_OFF },
    settings:  { ...ALL_OFF },
  },
}

export function buildPermissionMap(rows: PermissionRow[]): PermissionMap {
  const map = Object.fromEntries(
    MODULES.map(m => [m, { ...ALL_OFF }])
  ) as PermissionMap
  for (const row of rows) {
    const m = row.module as Module
    const a = row.action as Action
    if ((MODULES as readonly string[]).includes(m) && (ACTIONS as readonly string[]).includes(a)) {
      map[m][a] = row.enabled
    }
  }
  return map
}

export function hasPermission(
  map: PermissionMap | null,
  role: string,
  module: Module,
  action: Action,
): boolean {
  if (role === 'admin') return true
  if (!map) return false
  return map[module]?.[action] ?? false
}

export function defaultPermissionRows(role: string): PermissionRow[] {
  const defaults = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.field
  const rows: PermissionRow[] = []
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      rows.push({ module, action, enabled: defaults[module][action] })
    }
  }
  return rows
}
