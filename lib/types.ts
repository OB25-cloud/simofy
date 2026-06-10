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
  notes: string | null
  created_at: string | null
  clients: { name: string; business_name: string | null } | null
  staff: { name: string } | null
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

export type JobPhoto = {
  id: string
  job_id: string
  url: string
  created_at: string
}
