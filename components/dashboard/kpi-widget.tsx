'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPIWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  progress?: {
    current: number
    total: number
    label?: string
  }
  breakdown?: Array<{
    label: string
    value: number
    color?: string
  }>
  status?: 'normal' | 'warning' | 'critical'
  className?: string
  iconColor?: string
}

export function KPIWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  progress,
  breakdown,
  status = 'normal',
  className,
  iconColor
}: KPIWidgetProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'critical':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  const getDefaultIconColor = () => {
    switch (status) {
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className={cn('transition-colors hover:shadow-md', getStatusColor(), className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <Icon className={cn('h-4 w-4 md:h-5 md:w-5', iconColor || getDefaultIconColor())} />
        )}
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div className="text-xl md:text-2xl font-bold">{value}</div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}

        {progress && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.label || '진행률'}
              </span>
              <span className="font-medium">
                {progress.current}/{progress.total}
              </span>
            </div>
            <Progress 
              value={(progress.current / progress.total) * 100} 
              className="h-2"
            />
          </div>
        )}

        {breakdown && breakdown.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {item.color && (
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              전일 대비
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}