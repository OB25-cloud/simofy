'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { JobPhoto } from '@/lib/types'

type PhotoTag = 'before' | 'after' | null

const TAG_CONFIG = {
  before: { label: 'Before', bg: '#DBEAFE', text: '#1D4ED8' },
  after:  { label: 'After',  bg: '#DCFCE7', text: '#15803D' },
} as const

// ── sub-components ────────────────────────────────────────────────────────────

function DeleteIcon({ spinning }: { spinning: boolean }) {
  if (spinning) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

interface PhotoCardProps {
  photo: JobPhoto
  height?: string
  deleting: string | null
  onDelete: (photo: JobPhoto) => void
}

function PhotoCard({ photo, height = 'h-36', deleting, onDelete }: PhotoCardProps) {
  return (
    <div className="relative group">
      <a href={photo.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt="Job photo"
          className={`w-full ${height} object-cover rounded-lg border border-[#E5E7EB] hover:opacity-90 transition-opacity`}
        />
      </a>

      {/* Tag badge */}
      {photo.tag && (
        <span
          className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: TAG_CONFIG[photo.tag].bg, color: TAG_CONFIG[photo.tag].text }}
        >
          {TAG_CONFIG[photo.tag].label}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(photo)}
        disabled={deleting === photo.id}
        className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#DC2626] disabled:opacity-50"
        aria-label="Delete photo"
      >
        <DeleteIcon spinning={deleting === photo.id} />
      </button>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

const TAG_OPTIONS: { value: PhotoTag; label: string }[] = [
  { value: null,     label: 'Untagged' },
  { value: 'before', label: 'Before'   },
  { value: 'after',  label: 'After'    },
]

export default function JobPhotos({ jobId, initialPhotos }: { jobId: string; initialPhotos: JobPhoto[] }) {
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pendingTag, setPendingTag] = useState<PhotoTag>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const fileName = `${jobId}/${Date.now()}.${ext}`

    const { data: storageData, error: storageError } = await supabase.storage
      .from('job-photos')
      .upload(fileName, file)

    if (storageError) {
      console.error('[JobPhotos] storage upload FAILED —', storageError.message)
      setError(storageError.message)
      setUploading(false)
      return
    }
    console.log('[JobPhotos] storage upload SUCCESS — path:', storageData?.path)

    const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)

    const { data: photo, error: dbError } = await supabase
      .from('job_photos')
      .insert({ job_id: jobId, url: urlData.publicUrl, tag: pendingTag })
      .select()
      .single()

    if (dbError) {
      console.error('[JobPhotos] job_photos insert FAILED —', dbError.message)
      setError(dbError.message)
      setUploading(false)
      return
    }
    console.log('[JobPhotos] job_photos insert SUCCESS — tag:', pendingTag)

    setPhotos(prev => [...prev, photo])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(photo: JobPhoto) {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return
    setDeleting(photo.id)

    const storagePath = photo.url.split('/job-photos/')[1]
    const { error: storageError } = await supabase.storage.from('job-photos').remove([storagePath])
    if (storageError) {
      setError(storageError.message)
      setDeleting(null)
      return
    }

    const { error: dbError } = await supabase.from('job_photos').delete().eq('id', photo.id)
    if (dbError) {
      setError(dbError.message)
      setDeleting(null)
      return
    }

    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setDeleting(null)
  }

  const before   = photos.filter(p => p.tag === 'before')
  const after    = photos.filter(p => p.tag === 'after')
  const untagged = photos.filter(p => !p.tag)
  const hasTagged = before.length > 0 || after.length > 0

  return (
    <div>
      {/* Header + upload controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-[#1A1A2E]">
          Photos
          <span className="ml-2 text-sm font-normal text-[#6B7280]">({photos.length})</span>
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tag selector */}
          <div className="flex items-center rounded-lg border border-[#E5E7EB] p-0.5 bg-[#F4F5F7] gap-0.5">
            {TAG_OPTIONS.map(opt => {
              const active = pendingTag === opt.value
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => setPendingTag(opt.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                  style={
                    active
                      ? { background: '#C9A84C', color: '#fff' }
                      : { color: '#6B7280' }
                  }
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#1A1A2E] font-semibold rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#C9A84C' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {uploading ? 'Uploading…' : 'Upload Photo'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {error && <p className="text-xs text-[#EF4444] mb-3">{error}</p>}

      {photos.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
          <p className="text-sm text-[#6B7280]">No photos yet</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Before / After side-by-side columns */}
          {hasTagged && (
            <div className="grid grid-cols-2 gap-4">
              {(['before', 'after'] as const).map(tag => {
                const col = tag === 'before' ? before : after
                const cfg = TAG_CONFIG[tag]
                return (
                  <div key={tag}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {col.length} photo{col.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {col.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F4F5F7] h-32 flex items-center justify-center">
                        <p className="text-xs text-[#6B7280]">No {tag} photos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {col.map(p => (
                          <PhotoCard
                            key={p.id}
                            photo={p}
                            height="h-36"
                            deleting={deleting}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Untagged / general gallery */}
          {untagged.length > 0 && (
            <div>
              {hasTagged && (
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                  Other Photos
                  <span className="ml-1.5 font-normal normal-case">{untagged.length}</span>
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {untagged.map(p => (
                  <PhotoCard
                    key={p.id}
                    photo={p}
                    height="h-40"
                    deleting={deleting}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
