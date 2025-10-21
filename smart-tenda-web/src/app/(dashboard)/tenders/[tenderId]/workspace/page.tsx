 'use client'
import React, { useState } from 'react'
import { supabase } from '~/src/lib/supabaseClient'
import DocumentHub from '~/src/components/document-hub'

export default function WorkspacePage({ params }: { params: { tenderId: string } }) {
  const [running, setRunning] = useState(false)
  const [checks, setChecks] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runChecks = async () => {
    setRunning(true)
    setError(null)
    setChecks(null)
    try {
      // get supabase session access token
      const s = await supabase.auth.getSession()
      const token = s?.data?.session?.access_token
      if (!token) throw new Error('Not signed in')
      const res = await fetch('/api/checklist/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenderId: params.tenderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(JSON.stringify(data))
      } else {
        setChecks(data)
      }
    } catch (err: any) {
      setError(String(err))
    }
    setRunning(false)
  }

  const acceptCheck = async (checkId: string) => {
    try {
      const s = await supabase.auth.getSession()
      const token = s?.data?.session?.access_token
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`/api/checks/${checkId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      // update local state
      setChecks((prev) => prev?.map((c:any)=> c.id===checkId?{...c, detail:{...c.detail, accepted:true}}:c) ?? prev)
    } catch (err:any) {
      setError(String(err))
    }
  }

  return (
    <div>
      <h3>Workspace for {params.tenderId}</h3>
      <p>Simple editor placeholder.</p>
      <div style={{ marginTop: 16 }}>
        <button onClick={runChecks} disabled={running}>
          {running ? 'Running AI checks...' : 'Run AI checks'}
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <DocumentHub tenderId={params.tenderId} />
      </div>
      <div style={{ marginTop: 16 }}>
        {error && (
          <div style={{ color: 'red' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {checks && (
          <div>
            <h4>Checks</h4>
            <ul>
              {checks.map((c: any, i: number) => (
                <li key={i}>
                  <strong>{c.docType}</strong> — {c.status}
                  <div>{typeof c.detail === 'string' ? c.detail : JSON.stringify(c.detail)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
