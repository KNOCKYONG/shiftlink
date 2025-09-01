import { NextResponse } from 'next/server'
import type { ApiResponse, AppError, ErrorCode } from '@/types'

// ===============================
// API 응답 표준화 유틸리티
// ===============================

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T, 
  message?: string,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    meta
  })
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  error: string | AppError,
  status: number = 500,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  if (typeof error === 'string') {
    return NextResponse.json({
      success: false,
      error,
      errors
    }, { status })
  }

  return NextResponse.json({
    success: false,
    error: error.message,
    errors
  }, { status })
}

/**
 * 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  const pages = Math.ceil(total / limit)
  
  return NextResponse.json({
    success: true,
    data,
    message,
    meta: {
      total,
      page,
      limit,
      pages
    }
  })
}

// ===============================
// 표준 에러 응답들
// ===============================

export const ErrorResponses = {
  unauthorized: () => createErrorResponse('Unauthorized', 401),
  
  forbidden: (message?: string) => 
    createErrorResponse(message || 'Access denied', 403),
  
  notFound: (resource?: string) => 
    createErrorResponse(`${resource || 'Resource'} not found`, 404),
  
  conflict: (message?: string) => 
    createErrorResponse(message || 'Resource already exists', 409),
  
  validation: (errors: Record<string, string[]>) => 
    createErrorResponse('Validation failed', 400, errors),
  
  badRequest: (message: string) => 
    createErrorResponse(message, 400),
  
  tooManyRequests: () => 
    createErrorResponse('Too many requests', 429),
  
  internalError: (message?: string) => 
    createErrorResponse(message || 'Internal server error', 500)
}

// ===============================
// 에러 코드별 응답 매핑
// ===============================

export function createErrorByCode(code: ErrorCode, details?: string): NextResponse<ApiResponse> {
  const errorMap: Record<ErrorCode, () => NextResponse<ApiResponse>> = {
    AUTH_REQUIRED: () => ErrorResponses.unauthorized(),
    PERMISSION_DENIED: () => ErrorResponses.forbidden(details),
    RESOURCE_NOT_FOUND: () => ErrorResponses.notFound(details),
    VALIDATION_ERROR: () => ErrorResponses.badRequest(details || 'Validation error'),
    CONFLICT_ERROR: () => ErrorResponses.conflict(details),
    RATE_LIMIT_EXCEEDED: () => ErrorResponses.tooManyRequests(),
    INTERNAL_ERROR: () => ErrorResponses.internalError(details)
  }

  return errorMap[code]()
}

// ===============================
// API 핸들러 래퍼
// ===============================

type ApiHandler = (request: Request, context?: any) => Promise<NextResponse>

/**
 * 에러 처리가 포함된 API 핸들러 래퍼
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      
      if (error instanceof ApiError) {
        return createErrorByCode(error.code, error.message)
      }
      
      if (error instanceof Error) {
        // 개발 환경에서는 상세 에러 표시
        const message = process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error'
        return ErrorResponses.internalError(message)
      }
      
      return ErrorResponses.internalError()
    }
  }
}

// ===============================
// 커스텀 에러 클래스
// ===============================

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError('AUTH_REQUIRED', message)
  }

  static forbidden(message = 'Access denied') {
    return new ApiError('PERMISSION_DENIED', message)
  }

  static notFound(resource = 'Resource') {
    return new ApiError('RESOURCE_NOT_FOUND', `${resource} not found`)
  }

  static validation(message = 'Validation failed') {
    return new ApiError('VALIDATION_ERROR', message)
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError('CONFLICT_ERROR', message)
  }

  static internal(message = 'Internal server error') {
    return new ApiError('INTERNAL_ERROR', message)
  }
}

// ===============================
// 요청 검증 유틸리티
// ===============================

export async function validateJsonBody<T>(request: Request): Promise<T> {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw ApiError.validation('Content-Type must be application/json')
    }
    
    const body = await request.json()
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw ApiError.validation('Invalid JSON body')
  }
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T, 
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  )
  
  if (missingFields.length > 0) {
    const errors = missingFields.reduce((acc, field) => {
      acc[field as string] = [`${String(field)} is required`]
      return acc
    }, {} as Record<string, string[]>)
    
    throw new ApiError('VALIDATION_ERROR', 'Required fields missing', errors)
  }
}

// ===============================
// 페이지네이션 유틸리티
// ===============================

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))),
    search: searchParams.get('search') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }
}