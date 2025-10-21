"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '~/src/lib/supabaseClient'

export default function SupabaseAuth() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const sess = supabase.auth.getSession().then((r:any)=> setUser(r?.data?.session?.user ?? null)).catch(()=>{})
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setMessage(error.message)
    else setMessage('Magic link sent — check your email')
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (user) {
    return (
      <div>
        <div>Signed in as {user.email}</div>
        <button onClick={signOut}>Sign out</button>
      </div>
    )
  }

  return (
    <form onSubmit={signIn} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send magic link'}</button>
      {message && <div>{message}</div>}
    </form>
  )
}
