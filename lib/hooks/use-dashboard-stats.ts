import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useDashboardStats(date?: string) {
  const today = date || new Date().toISOString().split('T')[0]
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/stats?date=${today}`,
    fetcher,
    {
      // SWR 옵션들
      revalidateOnFocus: false, // 포커스 시 재검증 안함
      revalidateOnReconnect: true, // 네트워크 재연결 시 재검증
      refreshInterval: 5 * 60 * 1000, // 5분마다 자동 새로고침
      dedupingInterval: 2000, // 2초 내 중복 요청 방지
      fallbackData: null, // 초기 데이터
      keepPreviousData: true, // 새 데이터 로딩 중 이전 데이터 유지
    }
  )

  return {
    stats: data,
    error,
    isLoading,
    refresh: mutate
  }
}