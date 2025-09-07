import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type') // email_confirmation, recovery, etc.

  if (code) {
    const supabase = await createClient()
    
    console.log('Auth callback - exchanging code for session')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`)
    }
    
    if (data?.session) {
      console.log('Session created successfully')
      
      // If this is an email confirmation, redirect to dashboard
      if (type === 'email' || type === 'signup') {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}