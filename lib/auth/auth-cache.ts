import type { User, Session } from '@supabase/supabase-js'

interface CachedAuth {
  user: User | null
  session: Session | null
  employee: {
    userId: string
    email: string
    role: string
  } | null
  timestamp: number
}

const CACHE_KEY = 'shiftlink_auth_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30분

// 메모리 캐시 (SSR 지원)
let memoryCache: CachedAuth | null = null

// 캐시된 인증 정보 가져오기
export function getCachedAuth(): CachedAuth | null {
  try {
    // 메모리 캐시 먼저 확인
    if (memoryCache) {
      const now = Date.now()
      if (now - memoryCache.timestamp < CACHE_DURATION) {
        return memoryCache
      } else {
        memoryCache = null
      }
    }

    // 브라우저 환경에서만 localStorage 사용
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        let parsed: any
        try {
          parsed = JSON.parse(raw)
          // 이중 문자열화된 경우 처리 ("{\"user\":...}")
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed)
          }
        } catch (e) {
          // 손상된 캐시 제거
          localStorage.removeItem(CACHE_KEY)
          parsed = null
        }

        if (parsed && typeof parsed === 'object') {
          const now = Date.now()
          if (typeof parsed.timestamp !== 'number') {
            // 필수 필드 없으면 무효화
            localStorage.removeItem(CACHE_KEY)
          } else if (now - parsed.timestamp < CACHE_DURATION) {
            memoryCache = parsed as CachedAuth
            return memoryCache
          } else {
            localStorage.removeItem(CACHE_KEY)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting cached auth:', error)
  }
  
  return null
}

// 인증 정보 캐시에 저장
export function setCachedAuth(data: Omit<CachedAuth, 'timestamp'>): void {
  try {
    const cacheData: CachedAuth = {
      ...data,
      timestamp: Date.now()
    }
    
    // 메모리 캐시 업데이트
    memoryCache = cacheData
    
    // 브라우저 환경에서만 localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    }
  } catch (error) {
    console.error('Error setting cached auth:', error)
  }
}

// 캐시된 인증 정보 삭제
export function clearCachedAuth(): void {
  try {
    memoryCache = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY)
    }
  } catch (error) {
    console.error('Error clearing cached auth:', error)
  }
}

// 세션 갱신
export function refreshCachedSession(session: Session): void {
  const current = getCachedAuth()
  if (current) {
    setCachedAuth({
      ...current,
      session
    })
  }
}

// 직원 정보만 업데이트
export function updateCachedEmployee(employee: CachedAuth['employee']): void {
  const current = getCachedAuth()
  if (current) {
    setCachedAuth({
      ...current,
      employee
    })
  }
}

// 캐시 유효성 검사
export function isCacheValid(): boolean {
  const cached = getCachedAuth()
  if (!cached) return false
  
  const now = Date.now()
  const sessionExpires = cached.session?.expires_at 
    ? new Date(cached.session.expires_at).getTime() 
    : 0
  
  // 세션이 만료되지 않았고, 캐시 시간도 유효한지 확인
  return sessionExpires > now && (now - cached.timestamp) < CACHE_DURATION
}

// 캐시 정보 가져오기 (디버깅용)
export function getCacheInfo(): { 
  exists: boolean
  valid: boolean
  expiresIn?: number
  user?: string
  role?: string
} {
  const cached = getCachedAuth()
  if (!cached) {
    return { exists: false, valid: false }
  }
  
  const now = Date.now()
  const expiresIn = CACHE_DURATION - (now - cached.timestamp)
  
  return {
    exists: true,
    valid: isCacheValid(),
    expiresIn: expiresIn > 0 ? expiresIn : 0,
    user: cached.employee?.userId,
    role: cached.employee?.role
  }
}
