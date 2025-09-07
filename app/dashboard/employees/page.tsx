import { requireManagerOrAdmin } from '@/lib/auth/utils'
import { EmployeesClient } from './employees-client'

export default async function EmployeesPage() {
  const user = await requireManagerOrAdmin()
  
  return <EmployeesClient userRole={user.role} userTenantId={user.tenantId} />
}