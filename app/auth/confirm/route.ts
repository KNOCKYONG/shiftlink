import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // Email verified successfully, redirect to dashboard
      redirectTo.pathname = '/dashboard'
      return NextResponse.redirect(redirectTo)
    } else {
      // Error verifying email
      console.error('Email verification error:', error)
      redirectTo.pathname = '/auth/login'
      redirectTo.searchParams.set('error', 'auth_callback_error')
      redirectTo.searchParams.set('message', error.message)
      return NextResponse.redirect(redirectTo)
    }
  }

  // Redirect to login if no token
  redirectTo.pathname = '/auth/login'
  redirectTo.searchParams.set('error', 'auth_callback_error')
  redirectTo.searchParams.set('message', 'Invalid confirmation link')
  return NextResponse.redirect(redirectTo)
}