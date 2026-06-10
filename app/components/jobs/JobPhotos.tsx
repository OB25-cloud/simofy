'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { JobPhoto } from '@/lib/types'

export default function JobPhotos({ jobId, initialPhotos }: { jobId: string; initialPhotos: JobPhoto[] }) {
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const fileName = `${jobId}/${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from('job-photos')
      .upload(fileName, file)

    if (storageError) {
      setError(storageError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)

    const { data: photo, error: dbError } = await supabase
      .from('job_photos')
      .insert({ job_id: jobId, url: urlData.publicUrl })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setUploading(false)
      return
    }

    setPhotos((prev) => [...prev, photo])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
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
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Job photo"
                className="w-full h-40 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
