'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestLoginPage() {
  const [email, setEmail] = useState('admin@shiftlink.com')
  const [password, setPassword] = useState('admin123')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setResult(null)
    
    const supabase = createClient()
    
    try {
      // 직접 Supabase Auth 호출
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        setResult({ success: false, error: error.message })
      } else {
        // Employee 정보도 확인
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', email)
          .single()
        
        setResult({
          success: true,
          user: data.user,
          session: data.session ? 'Session created' : 'No session',
          employee: employee || empError?.message
        })
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Login Test Page</h1>
      
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block mb-2">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block mb-2">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>
      </div>
      
      {result && (
        <div className="mt-8 p-4 border rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}