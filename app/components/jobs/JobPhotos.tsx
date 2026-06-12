'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { JobPhoto } from '@/lib/types'

export default function JobPhotos({ jobId, initialPhotos }: { jobId: string; initialPhotos: JobPhoto[] }) {
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
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
      console.error('[JobPhotos] storage upload FAILED —', {
        name: storageError.name,
        message: storageError.message,
        // @ts-ignore
        statusCode: storageError.statusCode,
        // @ts-ignore
        error: storageError.error,
      })
      setError(storageError.message)
      setUploading(false)
      return
    }
    console.log('[JobPhotos] storage upload SUCCESS — path:', storageData?.path, '| fullPath:', storageData?.fullPath)

    const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)
    console.log('[JobPhotos] public URL:', urlData.publicUrl)

    const { data: photo, error: dbError } = await supabase
      .from('job_photos')
      .insert({ job_id: jobId, url: urlData.publicUrl })
      .select()
      .single()

    if (dbError) {
      console.error('[JobPhotos] job_photos insert FAILED —', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
      })
      setError(dbError.message)
      setUploading(false)
      return
    }
    console.log('[JobPhotos] job_photos insert SUCCESS — row:', photo)

    setPhotos((prev) => [...prev, photo])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(photo: JobPhoto) {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return

    setDeleting(photo.id)

    const storagePath = photo.url.split('/job-photos/')[1]
    const { error: storageError } = await supabase.storage
      .from('job-photos')
      .remove([storagePath])

    if (storageError) {
      console.error('[JobPhotos] storage delete FAILED —', {
        name: storageError.name,
        message: storageError.message,
      })
      setError(storageError.message)
      setDeleting(null)
      return
    }

    const { error: dbError } = await supabase
      .from('job_photos')
      .delete()
      .eq('id', photo.id)

    if (dbError) {
      console.error('[JobPhotos] job_photos delete FAILED —', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
      })
      setError(dbError.message)
      setDeleting(null)
      return
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    setDeleting(null)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Photos
          <span className="ml-2 text-sm font-normal text-gray-400">({photos.length})</span>
        </h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: '#B8922A' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {uploading ? 'Uploading…' : 'Upload Photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {photos.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
          <p className="text-sm text-gray-400">No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Job photo"
                  className="w-full h-40 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                />
              </a>
              <button
                onClick={() => handleDelete(photo)}
                disabled={deleting === photo.id}
                className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                aria-label="Delete photo"
              >
                {deleting === photo.id ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
