'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '~/src/lib/supabaseClient'

export default function DocumentHub({ tenderId }: { tenderId?: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [email, setEmail] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState('TenderNotice')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [cover, setCover] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession()
      setEmail(session?.session?.user?.email ?? null)
      await fetchDocs()
    }
    load()
  }, [])

  const fetchDocs = async () => {
    const res = await fetch('/api/docs/list', { headers: { authorization: `Bearer ${await getAccessToken()}` } })
    const json = await res.json()
    setDocs(Array.isArray(json) ? json : [])
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? ''
  }

  const handleUpload = async () => {
    if (!file) return alert('Select a file')
    setLoading(true)
    try {
      const token = await getAccessToken()
      const uploadResp = await fetch('/api/docs/upload-url', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ filename: file.name, contentType: file.type }) })
      const { uploadUrl, key } = await uploadResp.json()
      if (!uploadUrl) throw new Error('upload url failed')

      // upload directly to signed url with progress using XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      // create metadata
      await fetch('/api/docs/create', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ key, type }) })

      await fetchDocs()
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e)
      alert(e?.message || 'Upload failed')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    const token = await getAccessToken()
    await fetch('/api/docs/delete', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) })
    await fetchDocs()
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const moveSelected = (id: string, dir: 'up' | 'down') => {
    setSelected((s) => {
      const i = s.indexOf(id)
      if (i === -1) return s
      const copy = [...s]
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= copy.length) return copy
      const tmp = copy[j]
      copy[j] = copy[i]
      copy[i] = tmp
      return copy
    })
  }

  const handleCompile = async () => {
    if (selected.length === 0) return alert('Select documents to compile')
    const token = await getAccessToken()
    const res = await fetch('/api/docs/compile', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ docIds: selected, coverLetterHtml: cover, filename: 'submission', tenderId }) })
    const json = await res.json()
    if (json?.downloadUrl) {
      window.open(json.downloadUrl, '_blank')
      setSelected([])
      setCover('')
    } else {
      alert('Compile failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="TenderNotice">Tender Notice</option>
          <option value="BidBond">Bid Bond</option>
          <option value="NCA">NCA</option>
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={handleUpload} disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Documents</h3>
        <ul>
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} />
                <div>
                  <div className="font-medium">{d.type}</div>
                  <div className="text-sm text-muted-foreground">{d.s3Key}</div>
                </div>
              </div>
              <div className="space-x-2">
                <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${d.s3Key}`} target="_blank" rel="noreferrer">Preview</a>
                <button onClick={() => handleDelete(d.id)}>Delete</button>
                <button onClick={() => moveSelected(d.id, 'up')}>↑</button>
                <button onClick={() => moveSelected(d.id, 'down')}>↓</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold">Compile selection</h4>
        <textarea value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Optional cover letter (HTML allowed)" className="w-full h-24" />
        <div className="flex gap-2 mt-2">
          <button onClick={handleCompile} className="btn">Compile package</button>
          <button onClick={() => { setSelected([]); setCover('') }} className="btn-ghost">Clear</button>
        </div>
      </div>
    </div>
  )
}
