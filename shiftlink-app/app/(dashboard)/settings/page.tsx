import { requireManagerOrAdmin } from '@/lib/auth/utils'
import { SettingsPage } from './settings-page'

export default async function Settings() {
  // 관리자/매니저만 설정 변경 가능
  const user = await requireManagerOrAdmin()
  
  return <SettingsPage user={user} />
}