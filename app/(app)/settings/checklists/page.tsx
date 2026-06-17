import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import ChecklistsView from '@/app/components/settings/ChecklistsView'
import type { ChecklistTemplate, ChecklistTemplateItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ChecklistsSettingsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  const [{ data: templates }, { data: items }] = await Promise.all([
    supabase.from('checklist_templates').select('*').order('created_at', { ascending: true }),
    supabase.from('checklist_template_items').select('*').order('sort_order', { ascending: true }),
  ])

  const itemsByTemplate = new Map<string, ChecklistTemplateItem[]>()
  for (const item of (items ?? []) as ChecklistTemplateItem[]) {
    const arr = itemsByTemplate.get(item.template_id) ?? []
    arr.push(item)
    itemsByTemplate.set(item.template_id, arr)
  }

  const templatesWithItems = ((templates ?? []) as ChecklistTemplate[]).map(t => ({
    ...t,
    items: itemsByTemplate.get(t.id) ?? [],
  }))

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#B8922A' }}>Settings</p>
        <h1 className="text-xl font-bold text-gray-900">Checklist Templates</h1>
        <p className="text-sm text-gray-400 mt-0.5">Build reusable job checklists for your crew to work through on site.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChecklistsView initialTemplates={templatesWithItems} />
      </div>
    </div>
  )
}
