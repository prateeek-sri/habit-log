'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password
    })

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="shell" style={{ justifyContent: 'center' }}>
      <div style={{ maxWidth: '320px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: '#a0a5b8', fontSize: '13px' }}>Sign in or register automatically</p>
        </div>

        {error && <div style={{ color: '#f87171', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            Email
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              style={{
                background: '#1a1d2d',
                border: '1px solid #2a2d40',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            Password
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{
                background: '#1a1d2d',
                border: '1px solid #2a2d40',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </label>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: '#ffffff',
              color: '#000000',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 700,
              marginTop: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}
