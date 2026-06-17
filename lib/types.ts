export type Client = {
  id: string
  name: string
  business_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export type Site = {
  id: string
  client_id: string
  address: string | null
  location: string | null
  access_notes: string | null
  hazard_notes: string | null
  created_at: string
}

export type Job = {
  id: string
  title: string | null
  client_id: string | null
  site_id: string | null
  staff_id: string | null
  job_type: string | null
  status: string | null
  location: string | null
  scheduled_date: string | null
  completed_date: string | null
  is_recurring: boolean | null
  recurrence_pattern: string | null
  recurring_series_id: string | null
  checklist_template_id: string | null
  notes: string | null
  created_at: string | null
  clients: { name: string; business_name: string | null } | null
  staff: { name: string; pay_rate: number | null } | null
}

export type JobNote = {
  id: string
  job_id: string
  content: string
  created_by: string | null
  created_at: string
}

export type Staff = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  pay_rate: number | null
  is_active: boolean
  created_at: string
}

export type Quote = {
  id: string
  client_id: string | null
  job_id: string | null
  status: string | null
  valid_until: string | null
  notes: string | null
  subtotal: number | null
  gst: number | null
  total: number | null
  created_at: string
  sent_at: string | null
  last_followed_up_at: string | null
  clients: { name: string; email: string | null; phone: string | null } | null
  jobs: { title: string | null; job_type: string | null } | null
}

export type QuoteLineItem = {
  id: string
  quote_id: string
  description: string | null
  quantity: number | null
  unit_price: number | null
  amount: number | null
  sort_order: number | null
}

export type Invoice = {
  id: string
  client_id: string | null
  job_id: string | null
  quote_id: string | null
  amount: number | null
  tax: number | null
  total: number | null
  status: string | null
  due_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  clients: { name: string; email: string | null; phone: string | null } | null
  jobs: { title: string | null; job_type: string | null } | null
  quotes: { id: string } | null
}

export type Lead = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string
}

export type JobPhoto = {
  id: string
  job_id: string
  url: string
  tag: 'before' | 'after' | null
  created_at: string
}

export type Material = {
  id: string
  name: string
  unit: string
  unit_cost: number
  category: string | null
  created_at: string
}

export type Notification = {
  id: string
  client_id: string
  job_id: string | null
  type: string
  status: string
  sent_at: string | null
  scheduled_for: string | null
  created_at: string
  review_link: string | null
}

export type ChecklistTemplate = {
  id: string
  name: string
  created_at: string
}

export type ChecklistTemplateItem = {
  id: string
  template_id: string
  item_text: string
  sort_order: number
  required: boolean
}

export type JobChecklistItem = {
  id: string
  job_id: string
  template_item_id: string | null
  item_text: string
  required: boolean
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
}

export type JobMaterial = {
  id: string
  job_id: string
  material_id: string
  quantity: number
  unit_cost: number
  created_at: string
  materials: { name: string; unit: string } | null
}
