import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  // 임시로 로그인 페이지로 바로 리다이렉트
  redirect('/login')
}
